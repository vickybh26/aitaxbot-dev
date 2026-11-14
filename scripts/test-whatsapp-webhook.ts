import assert from "node:assert/strict";
import { verifyWebhook } from "../server/whatsapp/botLogic";

const previous = process.env.WHATSAPP_VERIFY_TOKEN;

function request(token?: string, challenge = "test-challenge") {
  const result = { status: 0, type: "", body: "" };
  const response = {
    status(code: number) { result.status = code; return response; },
    type(contentType: string) { result.type = contentType; return response; },
    send(body: string) { result.body = body; return response; },
    sendStatus(code: number) { result.status = code; return response; },
  };
  verifyWebhook({ query: {
    "hub.mode": "subscribe",
    ...(token === undefined ? {} : { "hub.verify_token": token }),
    "hub.challenge": challenge,
  } }, response);
  return result;
}

try {
  delete process.env.WHATSAPP_VERIFY_TOKEN;
  assert.equal(request().status, 403);
  process.env.WHATSAPP_VERIFY_TOKEN = "";
  assert.equal(request("").status, 403);

  process.env.WHATSAPP_VERIFY_TOKEN = "synthetic-webhook-secret-for-test-only";
  assert.equal(request("wrong").status, 403);
  const accepted = request(process.env.WHATSAPP_VERIFY_TOKEN, "<script>alert(1)</script>");
  assert.deepEqual(accepted, {
    status: 200,
    type: "text/plain",
    body: "<script>alert(1)</script>",
  });
  console.log("PASS: WhatsApp webhook fails closed and returns challenge as plain text");
} finally {
  if (previous === undefined) delete process.env.WHATSAPP_VERIFY_TOKEN;
  else process.env.WHATSAPP_VERIFY_TOKEN = previous;
}
