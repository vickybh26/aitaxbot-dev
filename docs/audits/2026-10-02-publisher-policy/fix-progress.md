# Publisher-policy remediation progress

This records local implementation status separately from the original live-site audit. Nothing here certifies AdSense approval or legal compliance. Changes have not been deployed.

## F1: service claims — locally fixed, verified

- `client/index.html`: replaced the filing-service promise in the shell title, Open Graph title, Twitter title and no-JavaScript heading. The description and fallback explicitly say that AiTaxBot does not file returns.
- `client/src/pages/AIS26ASForm16Tool.tsx` and `shared/seoContent.ts`: replaced the reconciliation tool's positive error-free-filing promise with potential-mismatch checking and AI-assisted explanations, with no filing or accuracy guarantee.
- `scripts/test-seo-parity.ts`: reads the shell title rather than maintaining a stale hard-coded title fragment; adds assertions against filing-service claims and for the no-filing disclosure.

Verification:

- `npm run typecheck`: passed.
- `npm run build`: passed. The sitemap generator also updated 26 last-modified dates in `client/public/sitemap.xml` to 2026-10-02; no routes were added.
- `npm run test:seo`: passed outside the sandbox after the sandbox run hit Windows `uv_os_get_passwd` ENOMEM. This test is a structural/content-coverage guard, not proof that all rendered and static prose is identical.
- `rg -n -i 'Free ITR Filing|File your ITR' client/index.html shared/seoContent.ts client/src/pages --glob '*.tsx'`: no matches (exit 1 is the expected no-match result).

Acceptance still outstanding: deploy the intended changes and re-run the live curl-based crawl; the original HTML snapshots remain pre-fix evidence.

## Subsequent fixes, 2 October 2026

| Finding | Local implementation | Remaining acceptance work |
|---|---|---|
| F2: NRE/SWP errors | Corrected audited NRE investment-exemption claims; replaced SWP stale rates, erroneous arithmetic, unsupported longevity examples and guaranteed-safe-withdrawal guidance. Shared FAQs and source links keep the two tax pages consistent. | Qualified review of the wider tax-content library; fresh live crawl after deployment. This is not a whole-site tax-law certification. |
| F3: privacy contradiction | Replaced the never-transmitted claim with browser maths, signed-in saving and Gemini-processing distinctions; synchronised relevant initial-HTML FAQs and privacy metadata. | Verify other retention/security/legal-timing promises separately; do not infer full DPDP compliance. |
| F4: incomplete legal HTML | Privacy and Terms now render the same complete shared React components on the server and browser. | Deployed HTML verification and browser smoke test. |
| F5: review authenticity | Removed blanket CA-review/verification wording from identified public components, metadata and FAQs. Removed 22 generic Certified Tax Expert reviewer entries plus 14 anonymous internal-team reviewer entries. | Founder CA qualification/practising-status and business-registration evidence remains unverified; founder claim was not silently changed. Restore scoped review claims only with genuine review records. |
| F6: regional CMP | AdSense loader disabled by default; custom preferences do not grant personalised-ad consent. | Verify certified CMP/TCF regional configuration in the AdSense account. No certified-CMP integration was invented or claimed. |
| F7: ad eligibility | Ad loading and slots require affirmative consent, the enable flag and an explicit editorial route. The allowlist contains the homepage, blog index and 36 published articles; tests compare it with the article library. Calculators, uploads, accounts, admin screens and unknown blog URLs are excluded. | Verify Auto ads exclusions/account settings before enabling the flag. Update the explicit article inventory when publishing new articles. |
| F8: fallback/parity | Removed immediate inline deletion; fallback is handed off only after the public Suspense boundary commits. Shared legal text and the two corrected FAQ sets remove those duplication risks. | Other hand-maintained page summaries still need a full rendered-content parity review; browser slow-load/failure test outstanding. |
| F9: consent loading | Removed pre-consent GA/Clarity SDK loading and config from index.html. Optional SDKs load after opt-in on editorial routes only. Added footer Cookie preferences; rejected/invalid preferences do not grant tracking. Navigation to financial/private routes reloads a clean document if SDKs were loaded. | Real-browser network/cookie tests including withdrawal and navigation. The reload occurs on the route effect; this is not proof of zero requests in the transition interval. Previously stored cookies are not comprehensively purged. |

Implementation references:

- `shared/swpGuidance.ts:3`, `shared/nriAccountGuidance.ts:3`: shared rules and FAQs.
- `shared/legalContent.tsx:5`: full shared legal disclosures.
- `server/vite.ts:154`: server-rendered legal body.
- `client/src/App.tsx:138`: deferred fallback handoff.
- `client/src/lib/publisherConsent.ts:10`: editorial route policy; `shared/publisherArticlePaths.ts:3`: explicit article inventory.
- `client/src/components/CookieConsent.tsx`: preference validation, withdrawal and clean-document navigation.
- `client/src/components/AdBanner.tsx`: slot-level eligibility and consent checks.

Verification commands:

- `npm run typecheck`
- `npm run build`
- `npm run test:seo`
- `npm run test:routes`
- `node node_modules/tsx/dist/cli.mjs scripts/test-publisher-fixes.ts`
- `node scripts/test-publisher-consent.mjs`

The final curl-based local HTTP harness returned 200 for both legal pages and asserted their complete body text against the shared React render: Privacy 1,716 words and Terms 1,182 words. Counts exclude the header and site navigation. The consent test uses mocked DOM/SDK objects, not a browser network trace; it covers opt-in, rejection, malformed preferences, default-off ads and 11 excluded paths.

### Deployment and AdSense configuration

No production deployment or AdSense-account changes were made. The original crawl snapshots are still pre-fix evidence. `VITE_ADSENSE_ENABLED` is intentionally false unless explicitly set to `true` at build time. Do not enable it until CMP coverage, eligible inventory and Auto ads settings have been verified. The publisher-account verification meta tag remains present.

### Attribution

This session owns the publisher-policy changes in client/index.html, the consent/analytics/ad components, affected content pages and blog reviewer metadata, server/vite.ts, shared SEO/legal/guidance modules, publisher regression scripts and audit documents. The build also regenerated sitemap last-modified dates.

Pre-existing work left separate: .env.example, package.json, scripts/ingest_pdfs.py, server/taxReconcileRoutes.ts, server/taxReconcileService.ts, server/taxTopicGraph.json, docs/adr-001-buyer-ready-tax-rag.md, docs/architecture/, social-design documents, scripts/test-rag-knowledge.mjs and scripts/test-reconcile-log-privacy.mjs. Claude is currently inactive according to the user; these files remain preserved for later tracking.

Existing unrelated work from other sessions was not staged, committed or pushed.

## Owner clarification and account inspection

The owner reports being a qualified Chartered Accountant and having manually checked all non-NRI calculators using limited scenarios. These checks were not exhaustive; NRI calculators were not checked. Article-review records were not supplied. Do not convert this into a blanket independent-review or all-scenarios verification claim. Public identity disclosure is not authorised.

Read-only AdSense account inspection on 2 October 2026:

- European regulations message for aitaxbot.co.in: **Published**, last modified 28 February 2026, English plus 31 languages. A second published message covers aitaxbot.in. This verifies configuration, not delivery on the live site or interaction with the custom banner.
- Ads / By site loaded an empty site table; Auto ads status could not be established from it. No settings were changed.
- Site detail still lists Low value content. Review attempts are throttled until **6 October 2026**. This is the account's next permitted date, not a recommended resubmission date.

Retention intent: do not retain source documents; retain extracted figures for the dashboard. Actual code inspected so far:

- `server/taxReconcileRoutes.ts:19`: Multer memory storage, not a disk-upload store.
- `server/taxReconcileRoutes.ts:537`: saves up to four action-item sentences to the dashboard, not the full extracted figure set.
- `server/taxReconcileService.ts:1046`, `:1206`, `:1346`: whole PDFs can be sent to Gemini as inline PDF data. Local non-persistence does not mean no third-party document processing.
- `server/savedResults.ts:123`: one latest result per user/tool. Independent saved-result deletion endpoints exist in `server/savedResultsRoutes.ts:5` and `:6`; their live behaviour has not been tested here.

Decisions still needed: expiry policy for retained figures and AI-review logs; whether reconciliation should continue whole-PDF Gemini processing or be redesigned to extract/redact locally and send only necessary figures. No provider zero-retention guarantee has been verified. AI rating failure remains untested after the latest deployment.
