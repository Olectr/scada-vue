# Zitadel SPA Login — Design

Date: 2026-07-07

## Goal

Gate the whole SCADA dashboard SPA behind Zitadel login. No backend — OIDC
Authorization Code + PKCE flow, public client. Token exchange happens
browser-side.

## Zitadel App Details

- Issuer/authority: `https://auth.mpstech.in`
- Client ID: `380710052102733827`
- App type: Web, auth method PKCE (public client, no secret)
- Redirect URIs to register in Zitadel console:
  - Dev: `http://localhost:5173/auth/callback`, `http://localhost:5173/silent-renew.html`
  - Prod: `https://<app>.ondigitalocean.app/auth/callback`, `https://<app>.ondigitalocean.app/silent-renew.html`
- Post-logout redirect URI: app root / `/login` (dev + prod)

## Scope

Whole app gated — no dashboard content renders without a valid session.

## Dependencies

- `vue-router` — app currently has no router (single-page tab-switch nav in
  `App.vue`). Needed to handle `/auth/callback` as a distinct route.
- `oidc-client-ts` — standard, framework-agnostic OIDC client. Handles PKCE,
  token storage, silent renew.

## Architecture

```
src/
  auth/
    oidc.js            # UserManager instance + config
  composables/
    useAuth.js          # user, isAuthenticated, login(), logout(), initAuth()
  router/
    index.js            # routes + auth guard
  views/
    LoginView.vue        # branded sign-in screen
    AuthCallback.vue      # processes ?code=...&state=...
public/
  silent-renew.html      # hidden-iframe target for automaticSilentRenew
```

### `src/auth/oidc.js`

`UserManager` config:
- `authority`: `https://auth.mpstech.in`
- `client_id`: `380710052102733827`
- `redirect_uri`: `<origin>/auth/callback`
- `post_logout_redirect_uri`: `<origin>/login`
- `silent_redirect_uri`: `<origin>/silent-renew.html`
- `response_type`: `code`
- `scope`: `openid profile email`
- `automaticSilentRenew`: `true`
- `userStore`: `WebStorageStateStore` backed by `sessionStorage` (tab-scoped —
  session does not survive tab close or leak across tabs)

### `src/composables/useAuth.js`

Wraps the `UserManager` singleton:
- `user` (ref) — current `User` object or `null`
- `isAuthenticated` (computed) — `!!user.value`
- `login()` — `userManager.signinRedirect()`
- `logout()` — `userManager.signoutRedirect()`
- `initAuth()` — called once at app boot, loads user from storage
  (`getUser()`), wires `silentRenewError` event to force logout

### `src/router/index.js`

Routes:
- `/` — main dashboard (current `App.vue` content), guarded
- `/login` — `LoginView.vue`, unguarded
- `/auth/callback` — `AuthCallback.vue`, unguarded

`beforeEach` guard: if route requires auth and `!isAuthenticated`, redirect to
`/login`. `/login` and `/auth/callback` are exempt.

### `LoginView.vue`

SCADA-branded screen matching existing visual style (dark theme, topbar
branding). Single "Sign in" button → `login()`. Shows a banner if `initAuth()`
failed to reach the issuer (network/DNS error at boot).

### `AuthCallback.vue`

Calls `signinRedirectCallback()`. On success, router push `/`. On failure
(state mismatch, expired code, user denied consent), show inline error with a
"Try again" button that calls `login()`.

### `App.vue` changes

- Mounted at `/` instead of directly in `main.js`.
- Topbar (right side, next to existing `conn`/`clock` widgets) gets the
  authenticated user's email + a logout button.

### `public/silent-renew.html`

Minimal static HTML, loads `oidc-client-ts`, calls `signinSilentCallback()`.
Runs in a hidden iframe triggered by `automaticSilentRenew`.

## Data Flow

1. User hits `/` unauthenticated → guard redirects to `/login`.
2. Click "Sign in" → `signinRedirect()` → browser navigates to Zitadel hosted
   login page.
3. User authenticates → Zitadel redirects to
   `/auth/callback?code=...&state=...`.
4. `AuthCallback.vue` exchanges code + PKCE verifier for tokens via
   `signinRedirectCallback()` → tokens stored in `sessionStorage` → router
   push `/`.
5. Guard sees authenticated user → dashboard renders.
6. Before token expiry, `automaticSilentRenew` silently refreshes tokens via
   hidden iframe hitting `/silent-renew.html` (uses Zitadel's own session
   cookie — no user interaction).
7. Logout → `signoutRedirect()` → Zitadel end-session → back to `/login`.

## Error Handling

- **Callback error** (state mismatch, expired code, user denied): caught in
  `AuthCallback.vue`, inline error UI + "Try again" button.
- **Silent renew failure** (IdP session actually expired): `UserManager`
  fires `silentRenewError`; `useAuth` catches it and forces logout/redirect
  to `/login` — no infinite retry loop.
- **Issuer unreachable at boot** (network/DNS): `initAuth()` catch shows
  `/login` with a "Can't reach identity provider" banner instead of a blank
  screen or crash.

## Environment / Build

- `.env`: `VITE_ZITADEL_AUTHORITY=https://auth.mpstech.in`,
  `VITE_ZITADEL_CLIENT_ID=380710052102733827`
- Baked at build time via `import.meta.env` — not secrets (public PKCE
  client), safe to bake into the static bundle.
- No change to DigitalOcean App Platform deploy process — static site build
  unchanged, only new env vars at build time.

## Known Limits (accepted)

- Tokens live in browser memory/sessionStorage — vulnerable to XSS. Acceptable
  for this internal dashboard; login gates UI/identity only, not a security
  boundary for data (no backend exists yet to enforce server-side).
- `sessionStorage` scoping means login does not persist across tab close or
  across multiple tabs — accepted trade-off for tighter session lifetime.

## Testing (manual — no backend, no automated test harness for OIDC redirect)

1. `npm run dev` → hit `localhost:5173` → confirm redirect to `/login`.
2. Click "Sign in" → confirm redirect to `auth.mpstech.in` login page.
3. Log in → confirm redirect to `/auth/callback` → then `/` → dashboard
   renders, topbar shows email.
4. Refresh page → still authenticated (sessionStorage) → no re-login prompt.
5. Click logout → confirm Zitadel end-session → back to `/login`,
   sessionStorage cleared.
6. Close tab, reopen → forced back to `/login` (sessionStorage scope
   confirmed).
7. Kill network to `auth.mpstech.in`, reload → confirm banner shows, no
   crash/blank screen.

Redirect URIs must be registered in the Zitadel console before testing (see
"Zitadel App Details" above) — this is a manual console step outside this
repo.
