import express from "express";
import session from "express-session";
import FileStoreFactory from "session-file-store";
import { rateLimit } from "express-rate-limit";
import * as oidc from "openid-client";
import { createProxyMiddleware } from "http-proxy-middleware";
import { randomBytes, timingSafeEqual } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
const ROOT = path.resolve(import.meta.dirname, "..");
const FileStore = FileStoreFactory(session);
const save = (s) =>
  new Promise((resolve, reject) => s.save((e) => (e ? reject(e) : resolve())));
const regenerate = (req) =>
  new Promise((resolve, reject) =>
    req.session.regenerate((e) => (e ? reject(e) : resolve())),
  );
export function ownerAllowed(claims, env) {
  return (
    !!claims &&
    claims.email_verified === true &&
    typeof claims.sub === "string" &&
    !!claims.sub &&
    typeof claims.email === "string" &&
    !!env.OWNER_EMAIL &&
    claims.email.toLowerCase() === env.OWNER_EMAIL.toLowerCase() &&
    (!env.OWNER_GOOGLE_SUB || claims.sub === env.OWNER_GOOGLE_SUB)
  );
}
export function validAppEntries(entries) {
  if (!Array.isArray(entries))
    throw new Error("Private app config must be an array");
  const ids = new Set();
  return entries.map((entry) => {
    if (
      !/^[a-z][a-z0-9-]{0,40}$/.test(entry.id) ||
      ids.has(entry.id) ||
      typeof entry.name !== "string"
    )
      throw new Error("Invalid or duplicate app ID/name");
    ids.add(entry.id);
    const target = new URL(entry.target);
    if (
      !["http:", "https:"].includes(target.protocol) ||
      target.username ||
      target.password ||
      target.search ||
      target.hash
    )
      throw new Error(
        "App targets must be HTTP(S) origins without credentials, query or fragment",
      );
    return { ...entry, target: target.href };
  });
}
export function createApp({
  env = process.env,
  oidcClient = oidc,
  sessionStore,
  appEntries,
} = {}) {
  const app = express();
  app.disable("x-powered-by");
  const origin = env.APP_ORIGIN || "http://localhost:3000";
  const originURL = new URL(origin);
  if (
    originURL.pathname !== "/" ||
    originURL.search ||
    originURL.hash ||
    originURL.username ||
    originURL.password
  )
    throw new Error("APP_ORIGIN must be a bare origin");
  const secure = originURL.protocol === "https:";
  if (
    !secure &&
    !["localhost", "127.0.0.1", "[::1]"].includes(originURL.hostname)
  )
    throw new Error("APP_ORIGIN must use HTTPS outside localhost");
  if (env.NODE_ENV === "production" && !secure)
    throw new Error("Production requires HTTPS APP_ORIGIN");
  if (env.TRUST_PROXY === "1") app.set("trust proxy", "loopback");
  const configured = Boolean(
    env.GOOGLE_CLIENT_ID &&
    env.GOOGLE_CLIENT_SECRET &&
    env.OWNER_EMAIL &&
    env.SESSION_SECRET?.length >= 32,
  );
  const entries = validAppEntries(
    appEntries ??
      (fs.existsSync(path.join(ROOT, "server/apps.json"))
        ? JSON.parse(
            fs.readFileSync(path.join(ROOT, "server/apps.json"), "utf8"),
          )
        : []),
  );
  const cookieName = secure ? "__Host-universe" : "universe-local";
  app.use((req, res, next) => {
    res.set({
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    });
    next();
  });
  const privateHeaders = (req, res, next) => {
    res.set({
      "Cache-Control": "no-store",
      "X-Frame-Options": "DENY",
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    });
    next();
  };
  app.use(["/auth", "/api/private", "/private"], privateHeaders);
  if (configured) {
    if (!sessionStore) {
      const dir = env.SESSION_DIR || path.join(ROOT, ".sessions");
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
      sessionStore = new FileStore({
        path: dir,
        ttl: 43200,
        reapInterval: 3600,
        logFn: () => {},
      });
    }
    app.use(
      session({
        name: cookieName,
        secret: env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        store: sessionStore,
        cookie: {
          httpOnly: true,
          secure,
          sameSite: "lax",
          maxAge: 12 * 60 * 60 * 1000,
          path: "/",
        },
      }),
    );
  }
  const unavailable = (res) =>
    res
      .status(503)
      .json({ error: "Owner access is not configured on this host." });
  const requireOwner = (req, res, next) => {
    if (!configured) return unavailable(res);
    if (!req.session?.owner)
      return req.originalUrl.startsWith("/api/")
        ? res.status(401).json({ error: "Sign in required." })
        : res.redirect("/command/index.html");
    // Re-check the allowlist on every request, including after configuration changes.
    if (!ownerAllowed(req.session.owner, env))
      return res.status(403).json({ error: "Owner access only." });
    next();
  };
  // Cross-origin mutations are rejected for both the gateway and proxied apps.
  const sameOrigin = (req, res, next) => {
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      req.get("origin") !== originURL.origin
    )
      return res.status(403).json({ error: "Cross-origin request rejected." });
    next();
  };
  app.get("/auth/status", (req, res) =>
    res.json({
      configured,
      signedIn: configured && ownerAllowed(req.session?.owner, env),
    }),
  );
  const loginLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  });
  let discovery;
  const getConfig = () =>
    discovery ||
    (discovery = oidcClient
      .discovery(
        new URL("https://accounts.google.com"),
        env.GOOGLE_CLIENT_ID,
        env.GOOGLE_CLIENT_SECRET,
      )
      .catch((error) => {
        discovery = null;
        throw error;
      }));
  app.get("/auth/google", loginLimit, async (req, res, next) => {
    if (!configured) return unavailable(res);
    try {
      const config = await getConfig();
      const verifier = oidcClient.randomPKCECodeVerifier(),
        state = oidcClient.randomState(),
        nonce = oidcClient.randomNonce();
      req.session.login = { verifier, state, nonce, created: Date.now() };
      await save(req.session);
      const target = oidcClient.buildAuthorizationUrl(config, {
        redirect_uri: originURL.origin + "/auth/callback",
        scope: "openid email",
        code_challenge: await oidcClient.calculatePKCECodeChallenge(verifier),
        code_challenge_method: "S256",
        state,
        nonce,
        prompt: "select_account",
      });
      res.redirect(target.href);
    } catch (e) {
      next(e);
    }
  });
  app.get("/auth/callback", loginLimit, async (req, res, next) => {
    if (!configured) return unavailable(res);
    const pending = req.session?.login;
    if (!pending || Date.now() - pending.created > 10 * 60 * 1000)
      return res
        .status(400)
        .send("Sign-in expired. Return to the Command Deck and try again.");
    // Consume the challenge once. Invalid attempts cannot reuse a previous login.
    delete req.session.login;
    await save(req.session);
    try {
      const config = await getConfig();
      const tokens = await oidcClient.authorizationCodeGrant(
        config,
        new URL(req.originalUrl, originURL),
        {
          pkceCodeVerifier: pending.verifier,
          expectedState: pending.state,
          expectedNonce: pending.nonce,
          idTokenExpected: true,
        },
      );
      const claims = tokens.claims();
      if (!ownerAllowed(claims, env))
        return res
          .status(403)
          .send("This Command Deck is available only to its owner.");
      await regenerate(req);
      req.session.owner = {
        sub: claims.sub,
        email: claims.email,
        email_verified: claims.email_verified,
      };
      req.session.csrf = randomBytes(32).toString("hex");
      await save(req.session);
      res.redirect("/private/");
    } catch (e) {
      res
        .status(400)
        .send(
          "Sign-in could not be verified. Return to the Command Deck and try again.",
        );
    }
  });
  app.post(
    "/auth/logout",
    sameOrigin,
    express.urlencoded({ extended: false, limit: "4kb" }),
    requireOwner,
    (req, res) => {
      const expected = req.session.csrf || "",
        actual = req.body?.csrf || "";
      if (
        typeof actual !== "string" ||
        Buffer.byteLength(actual) !== Buffer.byteLength(expected) ||
        !expected ||
        !timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
      )
        return res.status(403).json({ error: "Invalid sign-out request." });
      req.session.destroy((error) => {
        if (error) return res.status(500).send("Could not sign out.");
        res.clearCookie(cookieName, {
          path: "/",
          httpOnly: true,
          secure,
          sameSite: "lax",
        });
        res.redirect("/command/index.html");
      });
    },
  );
  app.use("/api/private", sameOrigin, requireOwner);
  app.get("/api/private/session", (req, res) =>
    res.json({ email: req.session.owner.email, csrf: req.session.csrf }),
  );
  app.get("/api/private/apps", (req, res) =>
    res.json(
      entries.map(({ id, name, description }) => ({
        id,
        name,
        description: description || "",
        href: `/private/apps/${id}/`,
      })),
    ),
  );
  app.use("/private", sameOrigin, requireOwner);
  app.get("/private/", (req, res) =>
    res.sendFile(path.join(ROOT, "server/deck.html")),
  );
  // Destinations are read from server-owned configuration, never a request URL.
  // HTTP apps must support their configured base path. WebSockets are intentionally not enabled.
  for (const entry of entries) {
    app.use(
      `/private/apps/${entry.id}`,
      createProxyMiddleware({
        target: entry.target,
        changeOrigin: true,
        ws: false,
        xfwd: false,
        proxyTimeout: 15000,
        timeout: 15000,
        on: {
          proxyReq(proxyReq) {
            proxyReq.removeHeader("cookie");
            proxyReq.removeHeader("authorization");
          },
          proxyRes(proxyRes) {
            delete proxyRes.headers["set-cookie"];
            proxyRes.headers["cache-control"] = "no-store";
          },
          error(error, req, res) {
            if (!res.headersSent)
              res.writeHead(502, { "Content-Type": "text/plain" });
            res.end("This private application is unavailable.");
          },
        },
      }),
    );
  }
  app.use("/private", (req, res) =>
    res.status(404).send("Private destination not found."),
  );
  app.use("/api/private", (req, res) =>
    res.status(404).json({ error: "Private endpoint not found." }),
  );
  app.get("/healthz", (req, res) => res.json({ status: "ok" }));
  // Explicit static allowlist: never expose the repository root, .env, session files or server config.
  for (const directory of [
    "shared",
    "js",
    "personal",
    "work",
    "my_web",
    "my_world_view",
    "blog",
    "worlds",
    "command",
  ])
    app.use(
      "/" + directory,
      express.static(path.join(ROOT, directory), {
        dotfiles: "deny",
        index: "index.html",
      }),
    );
  for (const file of [
    "index.html",
    "styles.css",
    "shared-space-theme.css",
    "config.js",
    "hud.js",
    "matrix.js",
    "mobile.js",
  ])
    app.get("/" + file, (req, res) => res.sendFile(path.join(ROOT, file)));
  app.get("/", (req, res) => res.sendFile(path.join(ROOT, "index.html")));
  app.use((req, res) => res.status(404).send("Destination not found."));
  app.use((err, req, res, next) => {
    console.error("Request failed:", err.name);
    if (res.headersSent) return next(err);
    res.status(503).json({ error: "The service is temporarily unavailable." });
  });
  return app;
}
