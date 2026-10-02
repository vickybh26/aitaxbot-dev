# AiTaxBot: sitewide Google Publisher Policy audit

Audit date: 2 October 2026 (Asia/Calcutta).
Target: https://www.aitaxbot.co.in
Policy: [Google Publisher Policies](https://support.google.com/adsense/answer/10502938?hl=en).

## Conclusion

I would not request another AdSense review yet. Verified public-content inconsistencies and calculation examples need correction. Privacy disclosures also contradict implemented account saving and AI requests. These findings justify changes, but do not establish Google's undisclosed reason for rejecting the application.

This is an audit, not a compliance certification. No application code, account settings, production data, or deployment was changed.

## Scope and reproducible evidence

- Fetched the live sitemap and all 62 listed URLs using curl.exe, plus eight diagnostic URLs: 70 HTTP checks.
- All 62 sitemap URLs returned HTTP 200. Of the eight diagnostics, seven returned 200 and the deliberately missing page returned 404.
- Retained every raw response in html/; crawl.csv contains per-URL measurements; crawl.json includes text, metadata, links and structured data.
- Read the shared rendering, cookie consent, ad component, analytics, tax calculator, article, About and privacy implementations.
- Opened the public Privacy page in a browser. Its main content contained 1,822 whitespace-separated words; its initial static content contained only 140.
- Inspected DOM script sources on that page before choosing cookies. AdSense's script was absent; GA and Clarity script elements were present. This is not a network capture and does not establish which data those scripts transmitted.
- Did not sign in as a taxpayer, upload documents, call Gemini, click ads, or inspect AdSense account settings.
- Did not visually inspect every page or every ad state. Copyright provenance, CMP configuration, Auto ads exclusions, remarketing audiences, publisher account declarations and sanctions screening remain unverified.

Reproduce live measurements: `node scripts/audit-publisher-policy.mjs`.
Reparse saved responses: `node scripts/audit-publisher-policy.mjs --offline`.

Counts exclude script/style contents. Main-content counts additionally exclude the static navigation and noscript fallback. Body counts include those elements. Counts are diagnostics, not Google's acceptance thresholds.

| Measurement | Result |
|---|---:|
| Sitemap URLs fetched | 62 |
| Blog articles fetched | 36 |
| Blog main-content words | 45,642 |
| All sitemap main-content words | 57,533 |
| Exact duplicate main-text groups | 0 |
| Sitemap responses containing the Free ITR Filing fallback | 62 |
| Income-tax calculator: body / main-content words | 644 / 568 |
| Income-tax calculator: text characters / HTML characters | 20.21% |
| SWP calculator: body / main-content words | 692 / 616 |
| NRO/NRE comparison: body / main-content words | 492 / 416 |

Zero exact duplicates within this crawl does not prove originality against other websites. HTTP 200 does not prove successful JavaScript execution or useful content.

## Findings and proposed changes

### F1 — High: the product advertises filing while describing itself as not filing

FINDING: Conflicting claims about the service's purpose.
EVIDENCE: All 62 sitemap responses include “Free ITR Filing” in the noscript fallback. client/index.html:185 supplies it; lines 135, 161 and 170 also contain filing branding. The live About response says the platform does not file returns on users' behalf, sourced from shared/seoContent.ts:395.
POLICY RISK: [Misleading representation](https://support.google.com/publisherpolicies/answer/11185754).
FIX: Replace filing promises with the actual service: tax calculations, planning, reconciliation and preparation assistance. Update fallback, social metadata and any corresponding visible copy together.
WHY: A visitor should understand what action the website will actually complete. Adding more paragraphs will not resolve this contradiction.
ACCEPTANCE: A fresh sitewide crawl contains zero unsupported filing promises.

### F2 — High: public financial guidance contains verified rate and arithmetic problems

FINDING: The NRE FAQ claims blanket exemptions that section 115E does not provide.
EVIDENCE: client/src/pages/nri/NRONREComparison.tsx:54 and shared/seoContent.ts:322 say NRE interest, dividends and capital gains are all tax-free under section 115E. The statement is present in the fetched NRO/NRE page.
POLICY RISK: Inventory value and misleading content; this is a content-quality finding, not a finding under Google's medical/election/climate “unreliable and harmful claims” subsection.
FIX: Separate eligible NRE deposit-interest treatment from dividends and capital gains, cite the applicable exemption provision, and state residency/account conditions. Review the full NRI page with a qualified reviewer.
WHY: Section 115E specifies tax on investment income and long-term gains rather than a blanket exemption. [Income-tax Act, amended through Finance Act 2025](https://incometaxindia.gov.in/Documents/income-tax-act-1961-as-amended-by-finance-act-2025.pdf).

FINDING: The SWP page contains old equity rates and inconsistent examples.
EVIDENCE: client/src/pages/SWPCalculator.tsx:25, :200 and :226 show 10% and a ₹1 lakh equity LTCG threshold. shared/seoContent.ts:181 repeats the FAQ. The fetched SWP page includes the old FAQ. The enacted 2024 amendment changed section 112A treatment to 12.5% with a ₹1.25 lakh threshold for the applicable transfers. [Finance (No. 2) Act 2024](https://incometaxindia.gov.in/news/finance-no.2-act-2024.pdf).
EVIDENCE: SWPCalculator.tsx:33 says a ₹1 crore corpus at 7% produces ₹70,000/year. PowerShell arithmetic gives ₹7,00,000; at 9%, ₹9,00,000 rather than ₹90,000. The same example calls ₹24,300 tax on ₹27,000 at 10%; arithmetic gives ₹2,700.
FIX: Rework examples using a stated withdrawal amount, actual gain fraction, acquisition/redemption dates and applicable rules. Reconcile every number and matching static FAQ.
WHY: Corpus return, withdrawal amount, principal recovery and taxable gains are different quantities.
ACCEPTANCE: Reviewer-signed corrected guidance with independently reproduced examples. This audit has not verified every tax statement across the 36 articles.

### F3 — High: the privacy policy contradicts actual calculator handling

FINDING: One privacy section promises that inputs never reach the server.
EVIDENCE: client/src/pages/privacy-policy.tsx:319 says calculator inputs are never transmitted to servers. Section 1a, including line 59, describes signed-in saving and sending calculation figures to Gemini. Both statements appeared in the rendered live page. useTrackToolUse.ts:79 posts saved payloads to /api/tool-usage; its SavedResultPayload at line 55 includes inputs. TaxCalculator.tsx:579 supplies inputs; geminiAIService.ts:240 calls /api/ai/tax-advice.
POLICY RISK: [Privacy disclosures](https://support.google.com/publisherpolicies/answer/10437794) and publisher accuracy.
FIX: Describe guest local calculations, signed-in saved results, optional AI processing, generated PDFs and analytics separately. Remove the unconditional “never transmitted” sentence. Verify retention and model-use statements against the actual services before retaining them.
WHY: Users need one consistent explanation of what leaves their device.
ACCEPTANCE: Each transmission/storage path has a matching disclosure, without contradictory guarantees.

### F4 — High: initial Privacy and Terms HTML lacks their full text

FINDING: The raw response only supplies summaries of these important pages.
EVIDENCE: Privacy main content is 140 words and has no Google cookie disclosure, compared with 1,822 words in browser-rendered main content. Terms main content is 165 words. The full third-party disclosure exists in privacy-policy.tsx:250 and appeared in the browser, but is absent from the raw privacy response.
POLICY RISK: Privacy disclosure accessibility; architecture gap, not proof that Google failed to execute JavaScript.
FIX: Deliver the full policy and terms in initial HTML and use the same content for the React view.
WHY: The raw pages refer to a full policy/terms document that is not present until JavaScript runs.
ACCEPTANCE: curl retrieves the complete sections, including advertising technologies, providers, opt-outs and contact details.

### F5 — High: reviewer claims are not substantiated by the inspected material

FINDING: Blanket professional-review statements have generic attribution.
EVIDENCE: About.tsx:132 claims every calculator/article is CA-reviewed; :198 claims CA founding and :201 says every tool/article is verified before publication. AuthorBox.tsx:14 names AiTaxBot Expert Team. blogPosts.ts contains 22 “Certified Tax Expert” markers; BlogPost.tsx:263 emits the article schema.
POLICY RISK: [Misleading representation](https://support.google.com/publisherpolicies/answer/11185754), conditional on whether those claims are true.
FIX: Establish who actually reviews which material and keep review records. Publish truthful reviewer or editorial attribution and dates with their permission. Remove claims that cannot be supported. Match structured data to the public attribution.
WHY: The observed tax errors make an unsupported “everything verified” promise particularly problematic.
ACCEPTANCE: Each retained review claim corresponds to evidence. A brand byline or your employment-related privacy preference is not itself proof of a violation; inventing credentials would make the problem worse.

### F6 — Medium/high, conditional: personalized-ad consent needs regional verification

FINDING: The repository contains a custom banner; certification and TCF integration are unverified.
EVIDENCE: CookieConsent.tsx:16 saves a local choice; :99 grants ad_personalization. The inspected implementation contains no TCF/CMP integration. A Google-configured message outside the repository may exist and was not inspected.
POLICY RISK: EU consent requirements if ads are served to the EEA, UK or Switzerland.
FIX: Verify AdSense Privacy & messaging configuration and use an appropriate Google-certified CMP for affected traffic. Test regional behavior and consent withdrawal.
WHY: A localStorage choice and Consent Mode flags do not by themselves establish certified CMP integration. [Google's CMP requirements](https://support.google.com/adsense/answer/13554116?hl=en).
ACCEPTANCE: Verified configuration and regional test evidence before serving affected ads.

### F7 — Medium/high, conditional: advertising is not restricted by page type

FINDING: Advertising consent enables the loader independently of the current route.
EVIDENCE: App.tsx:247 mounts CookieConsent globally. CookieConsent.tsx:110 loads AdSense whenever advertising is accepted. No route allowlist is present there. AdBanner.tsx:25 and :44 suppress the three placeholder manual slots; real manual ads are therefore not currently established by these wrappers.
POLICY RISK: Sensitive financial personalization, inventory value, and Auto ads on account/form-only pages.
FIX: Define eligible public editorial pages; exclude admin, account, login/signup, private results and document-processing views. Verify Auto ads exclusions and audience settings. Keep detailed income, debt, deductions, taxpayer identifiers and uploaded documents out of ad/audience parameters.
WHY: Detailed financial information must not be used for personalized ad targeting. A tax tool itself is not automatically prohibited. [Personalized advertising](https://support.google.com/publisherpolicies/answer/15101728).
ACCEPTANCE: Network tests confirm excluded routes make no ad requests and financial fields are absent from ad/audience payloads. This audit found no verified income-field transfer to AdSense.

### F8 — Medium: initial content and client content have separate lifecycles

FINDING: The entire initial content block is removed by an inline script.
EVIDENCE: server/vite.ts:162 calls remove() on seo-static-content. The live Privacy browser DOM confirms it is absent. shared/seoContent.ts keeps hand-written public-page copy separately from React; the policy summary/full-text difference is verified.
POLICY RISK: Content parity; possible search-spam concerns only where materially different or deceptive content is demonstrated.
FIX: Use one content source and render/hydrate it consistently. Retain usable static text until replacement succeeds; synchronize metadata and meaningful legal claims.
WHY: Dynamic rendering is not inherently cloaking; similar content is Google's stated condition. [Dynamic rendering guidance](https://developers.google.com/search/docs/crawling-indexing/javascript/dynamic-rendering).
ACCEPTANCE: Compare raw and rendered main content on every public route, including a failed-JavaScript case.

### F9 — Medium: consent promises require a runtime data-flow check

FINDING: “The rest only with consent” is stronger than the demonstrated loading behavior.
EVIDENCE: CookieConsent.tsx:158 states that promise. client/index.html:106 loads Clarity and :123–125 configures GA/Ads before a visitor decides. The fresh Privacy DOM contained GA and Clarity script elements while the consent banner was open; AdSense was absent.
POLICY RISK: Accuracy of privacy disclosures, with actual pre-consent data transmission still unverified.
FIX: Capture requests before choice, after rejection and after acceptance using a clean browser. Either gate nonessential libraries themselves or accurately disclose the behavior of the selected consent implementation. Provide an accessible way to reopen cookie settings; no such control was found in Footer.tsx.
WHY: Script presence does not prove cookies or personal data transmission, but consent-default comments are not proof that transmission is prevented.
ACCEPTANCE: Document observed request/cookie behavior and make the policy match it.

## Coverage of the remaining policy sections

The following coverage references the [policy's section list](https://support.google.com/adsense/answer/10502938?hl=en). “No evidence found” is limited to the inspected public text and implementations, not a legal or security clearance.

| Policy area | Assessment |
|---|---|
| Illegal content | No public promotion of illegal activity identified; broader legality not certified. |
| Intellectual property / counterfeit goods | No counterfeit offering identified; article/image/corpus licensing remains unverified. |
| Dangerous / derogatory content; animal cruelty | No relevant material identified in inspected public content. |
| Unreliable/harmful claims; manipulated media | No relevant election, medical or climate content identified; tax errors are F2. |
| Deceptive practices | Product and attribution concerns are F1/F5; no phishing operation established. |
| Enabling dishonest behavior | Rent-receipt generation exists; existence alone does not establish promotion of fraud. Generated-document controls were not tested. |
| Sexual content; compensated sex; mail-order brides; adult themes; child exploitation | No relevant material identified in inspected public content. |
| Dishonest declarations | Public ads.txt matches the ad-code publisher ID; private publisher/payment declarations unverified. |
| Ads interfering; out-of-context ads; excessive ads; Better Ads Standards | Manual slots are placeholders. Live served-ad behavior and Auto ads settings unverified. |
| Low/no publisher content | Public static corpus exists; F2/F5 identify quality concerns; form/account eligibility is F7. |
| Replicated content | No exact duplicate main-text groups within the 62-page crawl; external plagiarism and licensing unverified. |
| Unsupported languages | Inspected public content is English; no language blocker identified. |
| Personalized advertising / identifying users / EU consent | F6/F7/F9. Analytics helper sends page metadata/events; no verified AdSense PII transmission found. |
| Privacy disclosures | F3/F4/F9. Rendered policy already names Google advertising and provides opt-out links. |
| Cookies on Google domains | No code intentionally modifying Google-domain cookies identified. |
| Device/location data | No GPS collection path identified in inspected code; precise-location processing not independently tested. |
| COPPA | Rendered Privacy policy says services are not directed at under-18s; operational enforcement unverified. |
| Search spam | F8 requires parity checks; no confirmed cloaking finding made. |
| Abusive experiences | No forced redirect/back-button hijack established; complete interaction audit pending. |
| Malware / unwanted software | No malware behavior identified; this is not a binary/dependency security audit. |
| Authorized inventory | /ads.txt returned 200: google.com, pub-6497933645628124, DIRECT, f08c47fec0942fa0. |
| Sanctions | Public positioning is India-focused; beneficial ownership and account eligibility unverified. |

## Proposed sequence

1. Correct F1 and F2: unsupported service promises and verified financial errors.
2. Correct F3/F4: consistent privacy disclosures, delivered fully in initial HTML.
3. Establish the evidence behind F5 before keeping CA-review and founder credentials.
4. Define ad-eligible routes and verify F6/F7/F9 in AdSense and clean regional browser tests.
5. Resolve F8 across all public content and rerun the crawl.
6. Request another review only after the specific changes and checks are complete.

Do not infer a mandatory word count, required Udyam registration, automatic cryptocurrency-name penalty, or automatic penalty for an advice disclaimer from this policy. None of those rules appears in the cited policy. Likewise, an AI-looking design does not establish a violation; the concrete problems here concern content, claims, disclosures and ad behavior.

## Limits of the conclusion

Google's “Low value content” notice does not name the decisive URL or reason. This audit supplies actionable evidence and conditional risks, not a promise of approval. It is specifically an audit against Google Publisher Policies; it does not establish DPDP, tax-practice, employment-contract or international-law compliance.
