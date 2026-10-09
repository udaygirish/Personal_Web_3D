import test from "node:test";
import assert from "node:assert/strict";
import session from "express-session";
import { createServer } from "node:http";
import { createApp, ownerAllowed, validAppEntries } from "../server/app.mjs";
const env = {
  APP_ORIGIN: "http://localhost:3000",
  GOOGLE_CLIENT_ID: "test-client",
  GOOGLE_CLIENT_SECRET: "test-secret",
  OWNER_EMAIL: "owner@example.test",
  SESSION_SECRET: "x".repeat(48),
};
const listen = (server) =>
  new Promise((resolve) =>
    server.listen(0, "127.0.0.1", () =>
      resolve("http://127.0.0.1:" + server.address().port),
    ),
  );
const close = (server) => new Promise((resolve) => server.close(resolve));
function fakeOIDC(claims) {
  return {
    discovery: async () => ({}),
    randomPKCECodeVerifier: () => "verifier",
    randomState: () => "state-1",
    randomNonce: () => "nonce-1",
    calculatePKCECodeChallenge: async () => "challenge",
    buildAuthorizationUrl: () => new URL("https://accounts.google.com/test"),
    authorizationCodeGrant: async (config, url, checks) => {
      assert.equal(checks.pkceCodeVerifier, "verifier");
      assert.equal(checks.expectedNonce, "nonce-1");
      if (url.searchParams.get("state") !== checks.expectedState)
        throw new Error("state mismatch");
      return { claims: () => claims };
    },
  };
}
function cookie(response) {
  return response.headers.get("set-cookie")?.split(";")[0];
}
test("owner authorization requires verified exact identity", () => {
  const claims = {
    email: "owner@example.test",
    sub: "123",
    email_verified: true,
  };
  assert.equal(ownerAllowed(claims, env), true);
  for (const changed of [
    { email: "visitor@example.test" },
    { email_verified: false },
    { email_verified: "true" },
    { sub: "" },
  ])
    assert.equal(ownerAllowed({ ...claims, ...changed }, env), false);
  assert.equal(
    ownerAllowed(claims, { ...env, OWNER_GOOGLE_SUB: "different" }),
    false,
  );
});
test("private app config rejects dangerous target schemes and duplicate IDs", () => {
  assert.throws(() =>
    validAppEntries([{ id: "bad", name: "Bad", target: "file:///etc/passwd" }]),
  );
  assert.throws(() =>
    validAppEntries([
      { id: "../bad", name: "Bad", target: "http://localhost" },
    ]),
  );
  assert.throws(() =>
    validAppEntries([
      { id: "a", name: "A", target: "http://localhost" },
      { id: "a", name: "A", target: "http://localhost" },
    ]),
  );
});
test("unconfigured gateway fails closed and never serves config or source", async () => {
  const server = createServer(createApp({ env: {}, appEntries: [] }));
  const base = await listen(server);
  try {
    for (const route of [
      "/private/",
      "/api/private/apps",
      "/private/apps/lab/",
      "/auth/google",
    ])
      assert.equal(
        (await fetch(base + route, { redirect: "manual" })).status,
        503,
        route,
      );
    for (const route of [
      "/.env",
      "/server/app.mjs",
      "/server/apps.json",
      "/.git/config",
      "/package.json",
    ])
      assert.equal((await fetch(base + route)).status, 404, route);
    assert.deepEqual(await (await fetch(base + "/auth/status")).json(), {
      configured: false,
      signedIn: false,
    });
  } finally {
    await close(server);
  }
});
test("owner login rotates session; private API and proxy enforce it; logout revokes it", async () => {
  let upstreamRequests = 0,
    receivedCookie;
  const upstream = createServer((req, res) => {
    upstreamRequests++;
    receivedCookie = req.headers.cookie;
    res.end("private lab " + req.url);
  });
  const target = await listen(upstream);
  const server = createServer(
    createApp({
      env,
      sessionStore: new session.MemoryStore(),
      appEntries: [{ id: "lab", name: "Lab", target }],
      oidcClient: fakeOIDC({
        email: env.OWNER_EMAIL,
        sub: "owner-id",
        email_verified: true,
      }),
    }),
  );
  const base = await listen(server);
  try {
    assert.equal(
      (await fetch(base + "/api/private/apps", { redirect: "manual" })).status,
      401,
    );
    assert.equal(
      (await fetch(base + "/private/apps/lab/", { redirect: "manual" })).status,
      302,
    );
    assert.equal(upstreamRequests, 0);
    const login = await fetch(base + "/auth/google", { redirect: "manual" });
    assert.equal(login.status, 302);
    const oldCookie = cookie(login);
    assert.ok(oldCookie);
    const callback = await fetch(
      base + "/auth/callback?code=ok&state=state-1",
      { headers: { cookie: oldCookie }, redirect: "manual" },
    );
    assert.equal(callback.status, 302);
    assert.equal(callback.headers.get("location"), "/private/");
    const ownerCookie = cookie(callback);
    assert.notEqual(ownerCookie, oldCookie);
    assert.equal(
      (
        await fetch(base + "/api/private/apps", {
          headers: { cookie: oldCookie },
          redirect: "manual",
        })
      ).status,
      401,
    );
    const apps = await fetch(base + "/api/private/apps", {
      headers: { cookie: ownerCookie },
    });
    assert.equal(apps.status, 200);
    assert.equal(apps.headers.get("cache-control"), "no-store");
    assert.deepEqual(await apps.json(), [
      { id: "lab", name: "Lab", description: "", href: "/private/apps/lab/" },
    ]);
    const proxy = await fetch(base + "/private/apps/lab/status", {
      headers: { cookie: ownerCookie },
    });
    assert.equal(await proxy.text(), "private lab /status");
    assert.equal(receivedCookie, undefined);
    assert.equal(
      (
        await fetch(base + "/private/apps/lab/change", {
          method: "POST",
          headers: { cookie: ownerCookie, origin: "https://attacker.test" },
        })
      ).status,
      403,
    );
    assert.equal(upstreamRequests, 1);
    const data = await (
      await fetch(base + "/api/private/session", {
        headers: { cookie: ownerCookie },
      })
    ).json();
    const logout = await fetch(base + "/auth/logout", {
      method: "POST",
      redirect: "manual",
      headers: {
        cookie: ownerCookie,
        origin: env.APP_ORIGIN,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ csrf: data.csrf }),
    });
    assert.equal(logout.status, 302);
    assert.equal(
      (
        await fetch(base + "/api/private/apps", {
          headers: { cookie: ownerCookie },
          redirect: "manual",
        })
      ).status,
      401,
    );
  } finally {
    await close(server);
    await close(upstream);
  }
});
test("wrong owner and altered OAuth state cannot enter", async () => {
  const server = createServer(
    createApp({
      env,
      sessionStore: new session.MemoryStore(),
      appEntries: [],
      oidcClient: fakeOIDC({
        email: "intruder@example.test",
        sub: "123",
        email_verified: true,
      }),
    }),
  );
  const base = await listen(server);
  try {
    for (const [state, status] of [
      ["wrong", 400],
      ["state-1", 403],
    ]) {
      const login = await fetch(base + "/auth/google", { redirect: "manual" });
      const c = cookie(login);
      assert.equal(
        (
          await fetch(base + "/auth/callback?code=x&state=" + state, {
            headers: { cookie: c },
            redirect: "manual",
          })
        ).status,
        status,
      );
      assert.equal(
        (
          await fetch(base + "/api/private/apps", {
            headers: { cookie: c },
            redirect: "manual",
          })
        ).status,
        401,
      );
      assert.equal(
        (
          await fetch(base + "/auth/callback?code=x&state=" + state, {
            headers: { cookie: c },
            redirect: "manual",
          })
        ).status,
        400,
      );
    }
  } finally {
    await close(server);
  }
});

test("expired server sessions cannot read private content", async () => {
  const { createHmac } = await import("node:crypto");
  const store = new session.MemoryStore();
  await new Promise((resolve) =>
    store.set(
      "expired",
      {
        cookie: { expires: new Date(0).toISOString() },
        owner: {
          sub: "owner-id",
          email: env.OWNER_EMAIL,
          email_verified: true,
        },
      },
      resolve,
    ),
  );
  const signature = createHmac("sha256", env.SESSION_SECRET)
    .update("expired")
    .digest("base64")
    .replace(/=+$/, "");
  const expiredCookie =
    "universe-local=" + encodeURIComponent("s:expired." + signature);
  const server = createServer(
    createApp({ env, sessionStore: store, appEntries: [] }),
  );
  const base = await listen(server);
  try {
    const response = await fetch(base + "/api/private/apps", {
      headers: { cookie: expiredCookie },
      redirect: "manual",
    });
    assert.equal(response.status, 401);
  } finally {
    await close(server);
  }
});
