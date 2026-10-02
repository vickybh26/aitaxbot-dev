# Publisher and retention release — 2 October 2026

## Scope

Release the completed publisher-disclosure, full static legal-page rendering, shared SWP/NRI guidance, consent gating and retention fixes. AdSense SDK remains off by default (`VITE_ADSENSE_ENABLED` must explicitly be true). Optional analytics requires consent and an editorial route. Private/calculator routes are excluded. Review logs expire 30 days after creation; expired internal logs will be physically deleted by the startup/hourly cleanup. Saved tax history no longer expires or prunes earlier entries.

Read-only Firestore Admin API check during pre-release review returned `ttlConfig: null` for `taxCalculationHistory.expiresAt`. No TTL policy was reported on that field in the configured Firebase project. No production records or TTL settings were changed by the check.

Final disclosure adjustments remove remaining homepage metadata review claims, use qualified rather than practising CA in About crawler text, remove the reconciliation page's fixed past deadline, qualify extraction coverage, and explicitly disclose current whole-PDF Gemini processing. This release does not implement local PDF extraction or certify legal compliance. Provider zero retention/model-training guarantees are not asserted.

## Checks

- Typecheck, production build, route coverage, SEO parity, publisher HTTP parity, mocked consent and fake-database retention regressions required to pass before push.
- Local HTTP legal routes return 200; RAG admin endpoints return 401 without credentials.
- Last live smoke test: 62/62 sitemap pages HTTP 200; deliberate missing page HTTP 404. Four protected APIs returned 401 without credentials.
- No staging exists; main push automatically triggers Railway. No paid AI/document processing is included in release smoke checks.

## Post-push checks

Verify remote commit, then public raw HTML for full Privacy/Terms, no pre-consent GA SDK in the shell, corrected SWP/NRI wording, and retained 401/404 behaviour. A successful Git push is not proof of successful Railway deployment. Authenticated review cleanup and admin AI-rating behaviour require a separate check.

## Rollback

If public routes begin returning 5xx, login is broken, or saved history cannot be read, use a reviewed `git revert <release-commit>` and push it to main, or redeploy the previous known-good Railway release. Do not reset the shared working tree. Reverting code cannot restore review logs already deleted under the authorised 30-day policy.

## Separate work retained locally

Do not bundle pre-existing package/ingestion changes, tax-topic-graph changes, architecture/ADR documents or social-design work into this publisher/retention commit. Preserve these for independent review and attribution. Include only this release's logging-switch addition from the mixed `.env.example` file.

The pre-existing reconciliation service/routes privacy patch was reviewed separately: only diagnostics and explanatory comments change; document/model payloads and provider error objects are no longer logged. Its fixed-string logging regression passed. Publish it as a second, separately attributable commit together with `scripts/test-reconcile-log-privacy.mjs`; it does not implement local extraction.
