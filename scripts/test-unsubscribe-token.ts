import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { unsubToken, verifyUnsubToken } from "../server/emailService";

const original = {
  email: process.env.EMAIL_TOKEN_SECRET,
  brevo: process.env.BREVO_API_KEY,
};

try {
  delete process.env.EMAIL_TOKEN_SECRET;
  delete process.env.BREVO_API_KEY;
  assert.throws(() => unsubToken("user-1"), /not configured/);
  const oldPublicToken = createHmac("sha256", "aitaxbot-unsub")
    .update("unsub:digest:user-1").digest("hex").slice(0, 32);
  assert.equal(verifyUnsubToken("user-1", oldPublicToken), false);

  process.env.EMAIL_TOKEN_SECRET = "synthetic-signing-secret-for-test-only";
  const token = unsubToken("user-1", "digest");
  assert.equal(token.length, 32);
  assert.equal(verifyUnsubToken("user-1", token, "digest"), true);
  assert.equal(verifyUnsubToken("other-user", token, "digest"), false);
  assert.equal(verifyUnsubToken("user-1", token, "other-category"), false);

  delete process.env.EMAIL_TOKEN_SECRET;
  process.env.BREVO_API_KEY = "synthetic-legacy-key-for-test-only";
  const legacy = createHmac("sha256", process.env.BREVO_API_KEY)
    .update("unsub:digest:user-1").digest("hex").slice(0, 32);
  assert.equal(verifyUnsubToken("user-1", legacy), true);
  console.log("PASS: missing secret fails closed; scoped tokens verify; legacy key fallback remains available");
} finally {
  if (original.email === undefined) delete process.env.EMAIL_TOKEN_SECRET;
  else process.env.EMAIL_TOKEN_SECRET = original.email;
  if (original.brevo === undefined) delete process.env.BREVO_API_KEY;
  else process.env.BREVO_API_KEY = original.brevo;
}
