# Deploy Notes — Security Remediation + WhatsApp Gating

**Date:** 2026-04-18
**Author:** Claude (CTO)
**Scope:** Ship the 20-item security audit fixes and temporarily disable WhatsApp
routes so the app can deploy while the Meta/WABA Commerce Policy appeal is in
progress.

---

## What changed

### Security fixes (all 20 from audit — CRIT → LOW)
Every fix from the audit is now in `main`. Highlights:

- **CRIT** — removed the global mock-auth middleware; every authenticated route
  now requires a verified Firebase ID token via `authenticateFirebaseToken`.
- **CRIT** — tax-document routes, AI routes, and the external-proxy routes are
  all token-gated; no more user-supplied `userId` trust.
- **CRIT** — email templates now escape user input (`escapeHtml`) before
  interpolating into HTML bodies.
- **HIGH** — `helmet` (CSP, HSTS, etc.), per-endpoint `express-rate-limit`, and
  `express.json({ limit: '1mb' })` added at the top of `server/index.ts`.
- **HIGH** — upload filename path-traversal sanitized; PDF magic-byte check
  added in addition to MIME check.
- **HIGH** — WhatsApp webhook now verifies `X-Hub-Signature-256` HMAC against
  `WHATSAPP_APP_SECRET` via `crypto.timingSafeEqual` and fails closed.
- **HIGH** — `/api/whatsapp/leads` moved off query-string auth onto
  `Authorization: Bearer <ADMIN_KEY>` with timing-safe compare.
- **HIGH** — response body redacted from the request logger; error handler no
  longer leaks stack traces.
- **MED** — inline auth consolidated onto shared middleware; validation errors
  made generic; occupation field whitelisted.
- **LOW** — Firebase App Check token is now verified server-side via
  `appCheckGuard` when `APP_CHECK_ENFORCE=true`.

### WhatsApp routes gated behind env flag
`server/routes.ts` now conditionally mounts the WhatsApp router only when
`WHATSAPP_ENABLED=true`. With the flag unset (the default), the app starts
cleanly without any `WHATSAPP_*` env vars and the webhook endpoints return
404 — so Meta/WABA outage does not block the rest of the app.

```ts
if (process.env.WHATSAPP_ENABLED === "true") {
  app.use("/api", whatsappRoutes);
  console.log("[whatsapp] routes mounted (WHATSAPP_ENABLED=true)");
} else {
  console.log("[whatsapp] routes DISABLED (set WHATSAPP_ENABLED=true to enable)");
}
```

No other Meta dependencies touch startup — verified across `server/` tree.

---

## Railway env vars

### Required (app won't start without these)
| Var | Purpose |
|-----|---------|
| `DATABASE_URL` | Postgres connection (already set) |
| `BREVO_API_KEY` | Transactional email (already set) |
| `GEMINI_API_KEY` | AI tax advice (already set) |

### Recommended (security hardening)
| Var | Purpose |
|-----|---------|
| `FIREBASE_SERVICE_ACCOUNT` | JSON service-account key. If unset, auth middleware fails closed and protected routes return 401 — set this for prod. |
| `ADMIN_KEY` | Bearer token for `/api/whatsapp/leads` and any other admin-protected endpoints. Generate via `openssl rand -hex 32`. |
| `APP_CHECK_ENFORCE` | Set to `"true"` in prod to reject requests without a valid Firebase App Check token. |

### WhatsApp (LEAVE UNSET for this deploy)
| Var | Purpose |
|-----|---------|
| `WHATSAPP_ENABLED` | Must be `"true"` to mount the WhatsApp router. **Leave unset** until the Meta Commerce Policy appeal succeeds. |
| `WHATSAPP_APP_SECRET` | Meta app secret for HMAC webhook verification. |
| `WHATSAPP_VERIFY_TOKEN` | Meta webhook verification token (picked by us, entered into Meta's webhook config). |
| `WHATSAPP_PHONE_NUMBER_ID` | WABA phone number ID. |
| `WHATSAPP_ACCESS_TOKEN` | Permanent system-user token. |

---

## Re-enabling WhatsApp after the appeal

1. In Meta Business Manager, register a phone number on the WABA.
2. Generate a permanent access token (system user) in the Meta app.
3. Add all five `WHATSAPP_*` vars above to Railway (set `WHATSAPP_ENABLED=true`).
4. In Meta's webhook UI, point the callback URL at
   `https://www.aitaxbot.co.in/api/webhook/whatsapp` with
   `WHATSAPP_VERIFY_TOKEN` in the verify-token field.
5. Redeploy. Log line should flip from
   `[whatsapp] routes DISABLED` to `[whatsapp] routes mounted`.

---

## Verification checklist before merging to main

- [x] All 20 security-audit tasks complete (#1–#21 in task tracker).
- [x] `npm run typecheck` — only pre-existing schema errors in
      `storage.ts` / `seedTaxRates.ts` / `stockMarketIndia.js` (not introduced
      by this work).
- [x] No module-load-time Meta calls — `WHATSAPP_APP_SECRET` /
      `ADMIN_KEY` / access tokens are only read inside request handlers.
- [x] Webhook raw-body verify hook in `server/index.ts` is scoped to
      `/api/webhook/whatsapp` URL prefix — no-op when route is unmounted.

---

## Known pre-existing issues (NOT introduced here)

- `server/storage.ts` and `server/seedTaxRates.ts` have schema drift vs
  `shared/schema.ts` that produces TypeScript errors. These pre-date this
  branch and should be cleaned up in a dedicated refactor.
- `server/stockMarketIndia.js` is a plain JS file with no type declarations —
  import site in `routes.ts` triggers TS7016. Safe at runtime; needs a `.d.ts`.
