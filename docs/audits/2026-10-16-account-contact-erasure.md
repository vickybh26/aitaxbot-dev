# Account deletion: earlier calculator contact records

Decision: deleting an account also erases earlier calculator contact records
linked to the user's verified email. CA enquiries remain a separate workflow.

The account deletion handler reads the current Firebase Auth user record using
the authenticated UID. A profile email, request-body email, and stale token email
cannot select contacts for deletion. Without a verified email, the user's own
account can still be deleted, but the response and UI explain that older contact
records need separate ownership verification.

Legacy leads are scanned in document-ID pages of 400 and matched by trimmed,
case-insensitive email equality. Gmail dot/plus aliases are not inferred. Matching
records, including their stored marketing opt-in, are erased. Other people's
records and CA enquiries are preserved. Each delete batch is limited to 400;
account-scoped history/log/usage deletions also use bounded batches. Firebase
Auth deletion runs after storage cleanup. Errors propagate as HTTP 500 so the
request may be retried; no exception payload or contact content is logged.

Validation: `node node_modules/tsx/dist/cli.mjs scripts/test-account-deletion.ts`
uses synthetic Auth and Firestore adapters and checks 805 mixed-case contact
records, 1,650 account-owned history/log/usage records, unrelated records, aliases,
unverified identities, storage failures and retry. Curl exercises the handler
through localhost: DELETE /api/user/account returns 401 without authentication
and 200 with the synthetic authenticated identity. This does not validate live
Firebase configuration or delete production records.

Separate open items: scheduled retention of remaining legacy leads, CA enquiry
erasure, existing free-text AI-review records, provider-held data and any legally
required retention exceptions. No production-data cleanup or deployment is
performed by this change.
