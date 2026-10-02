# Owner decisions and implementation tracking — 2 October 2026

## Decisions

- Saved financial figures remain until user deletion, not inactivity expiry.
- Internal AI-answer comparisons are kept for 30 days from creation.
- Reconciliation must extract locally and pass only necessary structured figures to Gemini. Whole-PDF cloud parsing is not the desired future design.

## Step 1 — retention implemented locally

`server/aiReviewRetention.ts` defines the 30-day creation-time boundary. New review records have a Date-valued `expiresAt`; admin listing, stats, manual grading and AI evaluation reject expired records without waiting for physical deletion. Cleanup runs at startup and hourly, uses single-field timestamp queries, and deletes at most 8,000 expired `ai_queries` records per sweep, in 400-record batches. Legacy ISO timestamp records are covered. Missing/malformed timestamps are hidden; their physical deletion needs a separate inspection rather than guessing an age. Downtime, failures and a large backlog delay physical deletion. Provider backups and infrastructure-log retention are not covered by this job.

`AI_REVIEW_LOGGING_ENABLED=false` stops new comparison logs and additional production shadow calls; existing records still expire. It does not switch off the main user-facing RAG answer pipeline or remove Gemini as its generator.

`server/storage.ts` no longer deletes expired calculation history on read or prunes older entries when saving beyond ten. History reads no longer hide entries after the first ten. New saved history overrides `expiresAt` to null, including for internal callers. Explicit deletion remains unchanged. Latest-per-tool cards still replace the previous card, separately from explicitly saved history.

Privacy retention wording updated in `shared/legalContent.tsx`. This is implementation tracking, **not a certification of legal compliance**.

## Release prerequisite — historical history expiry

Check Firestore TTL configuration for `taxCalculationHistory`. Existing documents may still contain old expiry timestamps. If TTL is enabled, disable that policy and migrate historical expiry fields to null before releasing an unconditional retention promise. This session has not inspected or changed production TTL configuration, migrated historical records, or deleted production data. Retention already lost under the previous deletion behaviour is not automatically recoverable.

## Verification

- `npm run typecheck`: passed.
- `npm run build`: passed after the final history-read adjustment (frontend and server bundle).
- `node node_modules/tsx/dist/cli.mjs scripts/test-ai-review-retention.ts`: passed with fake database data. Tests creation-time boundary (including exactly 30 days), malformed/future dates, logging switch, legacy cleanup across 805 expired rows, batch size, idempotency and error propagation. Runtime history tests keep 12 old rows and append entry 13 without pruning or expiry.
- The same script curls the actual RAG router on localhost: listing, stats, grading and auto-grading return HTTP 401 without credentials. Authenticated production endpoints and Railway background-job execution are not verified here.
- No taxpayer PDFs or paid Gemini requests were used. Router construction may attempt a Qdrant client compatibility check; no authenticated cluster data is involved.

Test strategy: unit boundary tests plus fake-database pipeline tests, then HTTP authentication smoke checks. Remaining integration gaps are authenticated Firestore behaviour, TTL configuration, deployed cleanup monitoring and local-PDF extraction.

## Step 2 — reconciliation redesign pending, not claimed complete

The existing service still sends inline PDF data to Gemini. The privacy wording must not be changed to claim figures-only processing until that path is removed and tested.

Required acceptance checks:

1. Local PDF parsing supports passwords without forwarding them. Use the installed pdf-parse v2 API, not its old callable v1 API.
2. Unsupported/scanned PDFs fail clearly or use genuinely local OCR; never fall back to whole-PDF cloud processing.
3. Missing or uncertain financial rows remain unknown, not zero. Partial extraction must not produce a confident clean reconciliation.
4. Outbound AI input is an explicit allowlist of finite financial values, validated tax-year/section codes and server-authored labels. No raw text, identifiers, filenames, document metadata, source names or free-form extracted descriptions.
5. Synthetic fixtures containing PAN, names, contact information and addresses prove that these markers cannot enter AI prompts, saved summaries, review logs or error payloads.
6. Save the extracted figures needed for the dashboard using an approved schema; currently reconciliation saves action-item summaries, not the complete financial figure set.
7. Verify local text extraction and scanned/encrypted/error paths, typecheck, production build and HTTP responses before changing public processing claims.

## Attribution

This incremental change owns: new `server/aiReviewRetention.ts`, new `scripts/test-ai-review-retention.ts`, retention edits in `server/ragService.ts`, `server/ragRoutes.ts`, `server/index.ts`, `server/routes.ts`, `server/storage.ts`, `shared/schema.ts`, `shared/legalContent.tsx`, this document and the logging switch appended to `.env.example`. Prior edits in `.env.example` and `shared/legalContent.tsx` remain intact. Existing reconciliation service/routes work has not been altered by this retention step. Nothing committed, pushed or deployed.
