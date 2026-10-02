# Live website status — 2 October 2026

## Result

The public site is reachable and sampled navigation/calculation flows work. However, the live website does not yet show several tested local publisher/privacy fixes. This is a smoke test and deployment comparison, not a legal compliance certificate or a guarantee of AdSense approval.

## Scope and reproducible evidence

Raw HTTP crawl performed at `2026-10-02T11:20:37.260Z`:

```powershell
node scripts/audit-publisher-policy.mjs --output=docs/audits/2026-10-02-live-status
```

Evidence is in `crawl.json`, `crawl.csv`, `sitemap.xml`, and `html/`. The script invokes curl with redirects and a 25-second timeout. Counts strip scripts/styles; `contentWords` counts server-injected `#seo-static-content` copy without its navigation. `bodyWords` includes other raw body content, including noscript fallback. These are raw response measurements, not assertions about exactly how Google's crawler executes JavaScript.

- 62 sitemap URLs fetched: all HTTP 200.
- 70 targets total: 69 HTTP 200; the deliberately nonexistent `/policy-audit-missing-page` returned 404.
- All 62 sitemap pages had titles and canonicals matching the requested sitemap URL.
- 36 article routes checked. The shortest article's injected copy contained 939 words; this is not proof of accuracy, originality or review quality.
- `/robots.txt` and `/ads.txt` returned 200. ads.txt contains the Google DIRECT publisher declaration. This does not establish AdSense approval.
- Naked HTTPS domain redirected 301 to `https://www.aitaxbot.co.in/`; that URL returned 200.
- Homepage response included CSP, HSTS, `X-Content-Type-Options: nosniff` and frame protections. Headers alone do not establish overall security.

Read-only browser smoke testing:

- Homepage → income-tax calculator navigation worked. The wizard displayed name/mobile/email fields; calculation continuation was disabled before entering them. No personal details supplied; that complete flow was not tested.
- Optional cookies were rejected using the banner.
- Footer Privacy link opened the full client-rendered policy. Main DOM text counted 1,675 whitespace-delimited words; the raw injected policy copy counted 140 (raw entire body: 216). The scopes differ, but the browser policy includes sections missing from the raw response.
- HRA calculator default annual sample: basic + DA ₹6,00,000, HRA ₹2,40,000, rent ₹3,00,000, Mumbai. Clicking Calculate returned ₹2,40,000 exemption. Arithmetic matches the displayed formula: min(240000, 300000 − 0.1 × 600000, 0.5 × 600000) = 240000. This is one sample, not a tax-law or all-scenario certification.
- HRA detailed breakdown requested sign-in; no account created.
- Reconciliation form loaded; Reconcile was disabled without documents/sign-in. No PDFs uploaded and no paid AI processing tested.
- Login navigation preserved `returnUrl=/tools/ais-26as-form16`; no credentials entered.
- Captured browser warning/error query returned no entries for the tested tab; this is not proof of complete console or network health.

Unauthenticated production API checks:

```powershell
$paths = @('/api/saved-results','/api/tax-calculations','/api/ai/admin/queries','/api/ai/admin/eval-stats')
foreach ($path in $paths) { curl.exe -sS --max-time 15 -o NUL -w "$path HTTP:%{http_code} time:%{time_total}\n" "https://www.aitaxbot.co.in$path" }
```

All four returned HTTP 401 (observed request times approximately 0.38–0.44 seconds). This verifies rejection of missing credentials on these requests, not ownership isolation for authenticated accounts.

## Findings requiring attention

```text
FINDING       Consent gating fixes are not demonstrated on the live site.
EVIDENCE      Raw homepage contains an async googletagmanager script. After
              rejecting optional cookies, the rendered Privacy page still
              contains GA/Google Ads and Clarity script elements.
POLICY RISK   Privacy: consent enforcement needs verification; DOM presence
              is not a measurement of post-rejection network traffic.
FIX           Deploy/test the local opt-in gating; verify requests and cookie
              behaviour before consent, after rejection and after withdrawal.
```

```text
FINDING       Full trust-page server rendering is not present in production.
EVIDENCE      curl contentWords: Privacy 140, Terms 165. Local HTTP regression:
              full shared Privacy body 1810 words; Terms 1182 words.
POLICY RISK   Crawler/browser information parity and transparency. These
              counts alone do not establish a Google policy violation.
FIX           Deploy the tested full shared legal-body injection and repeat
              raw HTTP/browser checks on production.
```

```text
FINDING       Broad review claims remain visible on the live homepage.
EVIDENCE      Browser homepage says "Reviewed by CAs" and that each computation
              is signed off before shipping. Income-tax/HRA pages display
              "CA-Reviewed" and a team review attribution.
POLICY RISK   Misleading representation if the stated review scope cannot be
              supported. Owner confirmed limited non-NRI scenario review,
              not exhaustive review or independent/team sign-off.
FIX           Publish the scoped review wording already prepared locally.
              Preserve owner privacy; do not invent reviewers or credentials.
```

```text
FINDING       Previously corrected SWP and NRI text remains deployed.
EVIDENCE      Raw SWP FAQ still states equity LTCG at 10% above ₹1 lakh and a
              generic three-year debt/indexation rule. Raw NRI FAQ still
              groups NRE interest, dividends and capital gains as tax-free.
POLICY RISK   Content correctness/review gap. This smoke test identifies
              deployment differences, not a fresh complete tax-law opinion.
FIX           Deploy the tested shared SWP/NRI guidance; validate both raw
              HTML and client-rendered FAQ against the approved wording.
```

```text
FINDING       Reconciliation presents a past deadline and absolute coverage.
EVIDENCE      On 2 October 2026 the browser page twice displays July 31, 2026
              as its filing deadline and says AI spots "every mismatch".
POLICY RISK   Misleading representation: an unqualified past deadline and
              universal extraction guarantee need scope/limitations.
FIX           Use assessed-year/return-type-specific verified deadline text;
              describe detected mismatches and extraction limitations.
```

```text
FINDING       The agreed review-log retention disclosure is absent live.
EVIDENCE      Rendered Privacy policy has no "Internal AI-answer review records"
              section; it still contains the absolute statement that calculator
              inputs are never transmitted, alongside AI-provider/save claims.
POLICY RISK   Privacy transparency and internal consistency.
FIX           Verify Firestore TTL for old saved calculations, then release
              retention code and corrected disclosure together. Backend job
              execution cannot be established by this public-page check.
```

Relevant policy mapping: Google's [Publisher Policies](https://support.google.com/adsense/answer/10502938?hl=en) prohibit misleading representation, set privacy disclosure requirements, and prohibit Google ads on screens without publisher content or with low-value content. The cited policy does not provide a universal 500-word approval threshold. No rejection cause, crypto flag or approval outcome can be inferred from a word count alone.

## Local verification versus production

Commands rerun during this status check:

- `npm run typecheck` — passed.
- `node node_modules/tsx/dist/cli.mjs scripts/test-publisher-fixes.ts` — passed; local HTTP 200 full legal-body parity and stale SWP/NRI text absent.
- `node node_modules/tsx/dist/cli.mjs scripts/test-ai-review-retention.ts` — passed; fake-database retention boundaries, batched legacy purge, history preservation and localhost authentication checks.
- `node scripts/test-publisher-consent.mjs` — passed; mocked SDK opt-in/defaults/path gating. Not a live browser network trace.

Build was verified in the immediately preceding implementation turn; no app source was changed by this status test. The audit script gained an output-directory option solely to preserve earlier evidence. No commit, push, deployment, production data deletion, document upload or paid Gemini request performed. Test files may construct the Qdrant client and attempt its public compatibility check.

## Remaining verification gaps / next order

1. Inspect Firestore TTL for historical saved calculations before releasing the retention promise.
2. Release the tested local publisher/retention fixes through the user's normal reviewed GitHub → Railway process, then repeat these checks.
3. Implement and test figures-only local reconciliation; it remains unfinished. Do not claim PDFs are no longer sent to Gemini.
4. With authorised test accounts: test sign-in, save/reload/delete, ownership isolation, admin answer rating and cleanup-job operation. The previous automatic-rating failure remains untested live.
5. Capture browser network evidence for optional tracking/CMP behaviour, and perform a separately scoped mobile/accessibility and comprehensive tax-correctness test.

No public identity disclosure is needed to complete these technical tests. AdSense account status, Auto ads configuration, live paid-model quality, private dashboard contents and DPDP compliance certification are outside what was verified here.
