import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import express from "express";
import {
  AI_REVIEW_RETENTION_MS, aiReviewLoggingEnabled, aiReviewRetentionFields,
  isAIReviewCurrent, purgeExpiredAIReviews,
} from "../server/aiReviewRetention";

const now = Date.parse("2026-10-02T12:00:00.000Z");
const old = new Date(now - AI_REVIEW_RETENTION_MS).toISOString();
assert.equal(isAIReviewCurrent({ timestamp: old }, now), false);
assert.equal(isAIReviewCurrent({ timestamp: new Date(now - AI_REVIEW_RETENTION_MS + 1).toISOString() }, now), true);
assert.equal(isAIReviewCurrent({ timestamp: new Date(now + 1).toISOString() }, now), false);
assert.equal(isAIReviewCurrent({ timestamp: "invalid" }, now), false);
assert.equal(isAIReviewCurrent({}, now), false);
assert.equal(aiReviewRetentionFields(new Date(now)).expiresAt.getTime(), now + AI_REVIEW_RETENTION_MS);
const original = process.env.AI_REVIEW_LOGGING_ENABLED;
process.env.AI_REVIEW_LOGGING_ENABLED = "false";
assert.equal(aiReviewLoggingEnabled(), false);
process.env.AI_REVIEW_LOGGING_ENABLED = "true";
assert.equal(aiReviewLoggingEnabled(), true);
if (original === undefined) delete process.env.AI_REVIEW_LOGGING_ENABLED;
else process.env.AI_REVIEW_LOGGING_ENABLED = original;

// Fake database: no real user data, Firestore connection, or provider calls.
const rows = Array.from({ length: 805 }, (_, i) => ({ id: String(i), timestamp: old }));
rows.push({ id: "keep", timestamp: new Date(now).toISOString() });
const db = {
  collection(name: string) {
    assert.equal(name, "ai_queries");
    return { where(field: string, op: string, cutoff: string) {
      assert.equal(field, "timestamp"); assert.equal(op, "<=");
      return { limit(count: number) { return { async get() {
        const selected = rows.filter(row => row.timestamp <= cutoff).slice(0, count);
        return { empty: selected.length === 0, size: selected.length,
          docs: selected.map(row => ({ ref: row.id })) };
      } }; } };
    } };
  },
  batch() {
    const ids: string[] = [];
    return { delete(id: string) { ids.push(id); }, async commit() {
      assert.ok(ids.length <= 400);
      for (const id of ids) rows.splice(rows.findIndex(row => row.id === id), 1);
    } };
  },
};
assert.equal(await purgeExpiredAIReviews(db as any, now), 805);
assert.deepEqual(rows.map(row => row.id), ["keep"]);
assert.equal(await purgeExpiredAIReviews(db as any, now), 0);
await assert.rejects(purgeExpiredAIReviews({ collection() { throw new Error("unavailable"); } } as any, now));

const storage = readFileSync("server/storage.ts", "utf8");
const create = storage.slice(storage.indexOf("  async createTaxCalculation("), storage.indexOf("  async deleteTaxCalculation("));
assert.ok(create.includes("expiresAt: null"));
assert.ok(!create.includes(".delete()"), "Saving history must not prune older entries");
assert.ok(!storage.includes("await this.deleteExpiredTaxCalculations(userId)"));

const { FirestoreStorage } = await import("../server/storage");
const historyStore = new FirestoreStorage();
const historyRows = Array.from({ length: 12 }, (_, i) => ({ id: `saved-${i}`, userId: "test-user", calculatedAt: new Date(now - i).toISOString(), expiresAt: old }));
const historyDb = { collection(name: string) {
  assert.equal(name, "taxCalculationHistory");
  return {
    where(field: string, op: string, uid: string) {
      assert.deepEqual([field, op, uid], ["userId", "==", "test-user"]);
      return { async get() { return { docs: historyRows.map(row => ({ id: row.id, data: () => row })) }; } };
    },
    doc(id: string) { return { async set(row: any) { historyRows.push({ ...row, id }); } }; },
  };
} };
Object.defineProperty(historyStore, "db", { value: historyDb });
assert.equal((await historyStore.getTaxCalculationHistory("test-user")).length, 12, "Old figures are neither deleted nor hidden");
const saved = await historyStore.createTaxCalculation({ userId: "test-user", expiresAt: new Date(now + 1) });
assert.equal(saved.expiresAt, null);
assert.equal(historyRows.length, 13, "Saving entry 13 must not delete earlier figures");
assert.equal(await historyStore.deleteExpiredTaxCalculations("test-user"), 0);

// Smoke the actual changed router with curl. No token => no Firebase lookup.
const { default: router } = await import("../server/ragRoutes");
const app = express();
app.use(express.json());
app.use((_req, res, next) => {
  (res as any).apiError = (status: number, code: string, message: string) => res.status(status).json({ error: { code, message } });
  next();
});
app.use("/api/ai", router);
const server = app.listen(0, "127.0.0.1");
await new Promise<void>(resolve => server.once("listening", resolve));
const address = server.address() as { port: number };
// Spawn async curl: synchronous subprocess would block the HTTP event loop.
const { execFile } = await import("node:child_process");
try {
  for (const [method, path] of [["GET", "/admin/queries"], ["GET", "/admin/eval-stats"], ["POST", "/admin/queries/test/grade"], ["POST", "/admin/queries/test/auto-grade"]]) {
    const status = await new Promise<string>((resolve, reject) => {
      execFile("curl.exe", ["-s", "-o", "NUL", "-w", "%{http_code}", "-X", method, `http://127.0.0.1:${address.port}/api/ai${path}`], (error, stdout) => error ? reject(error) : resolve(stdout));
    });
    assert.equal(status, "401");
    console.log(`curl ${method} /api/ai${path}: ${status}`);
  }
} finally { await new Promise<void>(resolve => server.close(() => resolve())); }
console.log("PASS: 30-day boundaries, legacy purge, 805-row batches, idempotency, failure propagation, logging switch, history retention, HTTP auth guards");
