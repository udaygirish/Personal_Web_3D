# Private Command Deck

The public portfolio remains static. The optional Node gateway adds Google OpenID Connect sign-in and an owner-only launcher/proxy. It is designed for your own system, not GitHub Pages or the Sites hosting runtime. No deployment or provider configuration is performed by this branch.

## Start locally

1. Install Node 22 or later and run `npm ci`.
2. Copy `.env.example` to `.env` and fill in the fields below. `.env`, `server/apps.json`, and `.sessions/` are ignored by Git.
3. Create a Google OAuth **Web application** client. Register the exact callback `http://localhost:3000/auth/callback` for local development, and `https://YOUR_GATEWAY_DOMAIN/auth/callback` for production. Add the owner as a test user when the consent screen is in testing mode.
4. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `OWNER_EMAIL`. Use the email belonging to the intended Google identity. Optionally bind `OWNER_GOOGLE_SUB` to that identity's immutable subject. Generate `SESSION_SECRET` with `openssl rand -hex 32`.
5. Run `npm run build` and `npm start`. Open `http://localhost:3000/command/index.html`.

The server deliberately returns 503 for private routes when credentials, owner email or a sufficiently long session secret are missing. The public site still loads. There is no mock authentication, public sign-up, or client-side password bypass.

## Production on your system

- Set `APP_ORIGIN=https://YOUR_GATEWAY_DOMAIN` (no subpath) and `NODE_ENV=production`.
- Keep the server bound to `127.0.0.1`. Put a trusted HTTPS reverse proxy or Cloudflare Tunnel in front. Set `TRUST_PROXY=1` only when that proxy connects from loopback and supplies the correct `X-Forwarded-Proto`. This is required for secure cookies behind TLS termination.
- Register the production callback exactly in Google. A changed domain needs a matching callback.
- The session cookie is HttpOnly, SameSite=Lax, Secure in HTTPS deployments, and expires after 12 hours. Session IDs rotate after login; logout destroys the server session. Session records persist in `.sessions/` for a single-server deployment. Keep that directory private and persistent; use a shared production session store before adding multiple replicas.
- Core private responses are `no-store`. Every private request checks the current owner allowlist. Google identity tokens are validated by `openid-client`; the application checks verified email and optional subject. OAuth state, nonce, PKCE, and single-use/expiring login challenges are enabled.
- Session expiry redirects browser navigation to the gate and returns 401 to private API clients.

If the public site is hosted elsewhere, set `window.COMMAND_GATEWAY_ORIGIN` in `command/config.js` to the gateway's HTTPS origin. The gate then navigates to the secure host; it never shares session cookies or asks for cross-origin API access. Returning from that host uses the copy of the public site served by the gateway.

## Add private applications

Copy `server/apps.example.json` to `server/apps.json` and replace its example with your actual HTTP applications. Restart the gateway after changing this file. An empty array is valid and shows an honest empty state in the launcher.

```json
[
  {
    "id": "lab",
    "name": "Lab Control",
    "description": "Experiments and local tools",
    "target": "http://127.0.0.1:8080"
  }
]
```

The owner launcher links to `/private/apps/lab/`, which is checked server-side before proxying. The incoming prefix is removed: `/private/apps/lab/status` reaches the target's `/status`. Configure the upstream app to generate asset/API links using `/private/apps/lab/`, or use relative links. The target may include a base path when that matches the upstream's routing.

This initial proxy supports trusted HTTP apps that work with path-prefix routing and do not require their own browser cookies. It strips gateway cookies and Authorization headers before forwarding, and strips upstream Set-Cookie. WebSockets are not enabled. Root-absolute asset URLs, independent login sessions, WebSockets and cross-domain redirects require a dedicated integration or a separately protected app hostname. Test each upstream before registering it for everyday use. Do not assume an arbitrary existing dashboard will work unchanged.

Bind upstreams to loopback/private networks so their original ports cannot bypass the gateway. For incompatible apps, use a dedicated hostname protected by Cloudflare Access with an owner-only policy. Never expose the upstream directly and rely on the wormhole being hidden. App target addresses are server configuration and are not sent in the launcher API.

## Public blog domain

Set `SITE_URL` to the real public site URL (including a trailing repository subpath if hosted on GitHub Pages). Run `npm run build` with that environment variable exported. It generates absolute RSS links and canonical article URLs. Without a public domain, those metadata links and RSS controls are omitted rather than inventing a production URL. Example: `SITE_URL=https://your-domain.example npm run build`.

## Verification and remaining setup

`npm test` uses an isolated fake identity provider to exercise OAuth state, owner allowlisting, session rotation, proxy authorization, cross-origin rejection, and logout without real credentials. It does not contact Google. Complete a real owner login and a different-account rejection test after configuring your provider and HTTPS host. Google credentials, a public domain, actual app targets, and that live end-to-end authentication test remain deployment tasks.

SuperTokens is not required for this version: Google OpenID Connect supplies identity, while this gateway manages owner sessions. It can be replaced with SuperTokens later without changing public wormhole navigation.
