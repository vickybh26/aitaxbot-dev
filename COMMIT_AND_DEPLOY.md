# Commit & deploy — run these from Windows terminal

All 20 security fixes + WhatsApp gating are staged in your working tree.
Run these from `C:\Users\Vicky\ATB\aitaxbot-upload\Ai-tax-Bot`:

## 1. Clear any stale git lock (if present)
```powershell
Remove-Item .git\index.lock -ErrorAction SilentlyContinue
```

## 2. Verify what's staged
```powershell
git status
```

You should see these files modified/added:
- `package.json`
- `server/accountingRoutes.ts`
- `server/adminRoutes.ts`
- `server/firebase.ts`
- `server/geminiTaxService.ts`
- `server/index.ts`
- `server/middleware/auth.ts`
- `server/routes.ts`
- `server/whatsapp/whatsappRoutes.ts`
- `DEPLOY_NOTES.md` (new)
- `COMMIT_AND_DEPLOY.md` (new — this file)

## 3. Stage everything
```powershell
git add package.json server/accountingRoutes.ts server/adminRoutes.ts server/firebase.ts server/geminiTaxService.ts server/index.ts server/middleware/auth.ts server/routes.ts server/whatsapp/whatsappRoutes.ts DEPLOY_NOTES.md COMMIT_AND_DEPLOY.md
```

## 4. Commit

Copy this **entire block** (including the backticks/quotes) and paste into PowerShell:

```powershell
git commit -m "security: complete audit remediation (CRIT/HIGH/MED/LOW) + gate WhatsApp routes

Security fixes (20 items from audit, all landed):
- CRIT: remove global mock-auth middleware; every route now requires a verified
  Firebase ID token via authenticateFirebaseToken
- CRIT: add auth to tax-document routes; no more user-supplied userId trust
- CRIT: gate AI and external-proxy routes behind auth + rate limiting
- CRIT: escape HTML in email templates (escapeHtml helper)
- CRIT: fix admin-level bypass
- HIGH: helmet (CSP/HSTS), express-rate-limit per endpoint, 1 MB body cap
- HIGH: sanitize upload filename path traversal; PDF magic-byte check
- HIGH: verify WhatsApp webhook X-Hub-Signature-256 HMAC (timingSafeEqual);
  fail closed if WHATSAPP_APP_SECRET unset
- HIGH: move /api/whatsapp/leads off query-string auth onto
  Authorization: Bearer ADMIN_KEY
- HIGH: redact response body from logger; error handler no longer leaks stack
- MED: consolidate inline auth onto shared middleware
- MED: generic validation errors; occupation whitelist
- LOW: server-side verification of Firebase App Check token (appCheckGuard,
  gated by APP_CHECK_ENFORCE env var)

Deploy gating:
- WhatsApp router is now conditionally mounted behind WHATSAPP_ENABLED env
  flag so the server boots cleanly while the Meta/WABA Commerce Policy
  appeal is in progress. No other Meta dependencies touch startup.
- DEPLOY_NOTES.md documents required vs optional env vars and how to flip
  WhatsApp back on post-approval.

Typecheck: only pre-existing schema errors in storage.ts / seedTaxRates.ts /
stockMarketIndia.js remain; nothing introduced by this change.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

## 5. Push to Railway
```powershell
git push origin main
```

## 6. In Railway dashboard — set env vars

### Must be set (app already expects these, just confirm they're still there):
- `DATABASE_URL`
- `BREVO_API_KEY`
- `GEMINI_API_KEY`

### Strongly recommended to add now:
- `FIREBASE_SERVICE_ACCOUNT` — paste your service-account JSON (single line).
  Without this, authenticated routes return 401 instead of working with mock auth.
- `ADMIN_KEY` — generate with `openssl rand -hex 32` (or any 64-char hex string)
- `APP_CHECK_ENFORCE` — set to `true` in prod only

### Must stay UNSET for now:
- `WHATSAPP_ENABLED` — leave blank (not set). This keeps the WhatsApp routes
  disabled until the Meta appeal comes through.

Everything else (`WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`,
`WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`) can stay unset too —
they're only read when `WHATSAPP_ENABLED=true`.

## 7. After Railway finishes the deploy

Open Railway logs. You should see one of these lines near startup:
```
[whatsapp] routes DISABLED (set WHATSAPP_ENABLED=true to enable)
```

If you see that line, the deploy is healthy and WhatsApp is correctly gated.

## 8. When Meta approves the WABA

1. Register a phone number on the WABA in Meta Business Manager.
2. Create a permanent system-user access token.
3. Add all five `WHATSAPP_*` env vars to Railway (see `DEPLOY_NOTES.md` §
   "Re-enabling WhatsApp").
4. Redeploy. The log line will flip to `[whatsapp] routes mounted`.
5. Set the Meta webhook callback URL to
   `https://www.aitaxbot.co.in/api/webhook/whatsapp`.
