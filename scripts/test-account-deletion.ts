/** Synthetic Firestore/Auth adapters; no credentials or production writes. */
import assert from "node:assert/strict";
import express from "express";
import { execFile } from "node:child_process";
import { createDeleteAccountHandler } from "../server/accountDeletion";

function harness(options: { verified?: boolean; failCommit?: boolean; failIdentity?: boolean } = {}) {
  const data = new Map<string, Record<string, unknown>>();
  const events: string[] = [];
  let failCommit = options.failCommit || false;
  const ownEmail = "owner@example.invalid";
  for (let index = 0; index < 805; index++) data.set(`leads/${String(index).padStart(4, "0")}`, {
    email: index % 2 ? ownEmail : " OWNER@Example.Invalid ", marketingConsent: true,
  });
  data.set("leads/z-other", { email: "other@example.invalid" });
  data.set("leads/z-alias", { email: "owner+another@example.invalid" });
  data.set("leads/z-no-email", { name: "unlinked" });
  data.set("caContactRequests/keep", { userEmail: ownEmail });
  for (const name of ["userProfileLogs", "taxCalculationHistory", "toolUsage"]) {
    for (let index = 0; index < 550; index++) data.set(`${name}/${index}`, { userId: "owner" });
    data.set(`${name}/other`, { userId: "other" });
  }
  data.set("users/owner", { email: "editable-profile@example.invalid" });
  data.set("users/other", {});
  data.set("crmNotes/owner", {});
  data.set("savedResults/owner", {});
  function snapshot(path: string) { return { id: path.split("/")[1], ref: { path }, data: () => data.get(path) }; }
  const db = {
    collection(name: string) {
      let after = "";
      let limit = Infinity;
      let filter: ((row: Record<string, unknown>) => boolean) = () => true;
      const query = {
        doc: (id: string) => ({ path: `${name}/${id}` }),
        orderBy() { events.push(`scan:${name}`); return query; },
        limit(value: number) { limit = value; return query; },
        startAfter(cursor: { ref: { path: string } }) { after = cursor.ref.path; return query; },
        where(field: string, op: string, value: string) {
          assert.equal(op, "=="); filter = row => row[field] === value; return query;
        },
        async get() {
          const docs = [...data.keys()].filter(path => path.startsWith(name + "/") && path > after && filter(data.get(path)!)).sort().slice(0, limit).map(snapshot);
          return { docs, empty: docs.length === 0, size: docs.length };
        },
      };
      return query;
    },
    batch() {
      const paths: string[] = [];
      return {
        delete(ref: { path: string }) { paths.push(ref.path); },
        async commit() {
          assert.ok(paths.length <= 400);
          if (failCommit) { failCommit = false; throw new Error("simulated storage outage"); }
          paths.forEach(path => data.delete(path)); events.push(`commit:${paths.length}`);
        },
      };
    },
  };
  const handler = createDeleteAccountHandler({
    getDb: () => db as any,
    getAuth: () => ({
      async getUser(uid: string) {
        assert.equal(uid, "owner"); events.push("identity");
        if (options.failIdentity) throw new Error("identity unavailable");
        return { uid, email: ownEmail, emailVerified: options.verified !== false } as any;
      },
      async deleteUser(uid: string) { assert.equal(uid, "owner"); events.push("delete-auth"); },
    }),
    async deleteSavedResults(uid: string) { assert.equal(uid, "owner"); data.delete("savedResults/owner"); events.push("saved-results"); return 1; },
  });
  async function invoke(userId: string | undefined = "owner") {
    let status = 200;
    let body: any;
    await handler({ userId, userEmail: "other@example.invalid", body: { email: "other@example.invalid", userId: "other" } } as any, {
      status(value: number) { status = value; return this; }, json(value: unknown) { body = value; return this; },
    } as any);
    return { status, body };
  }
  return { data, events, invoke, handler };
}

const verified = harness();
let result = await verified.invoke();
assert.equal(result.status, 200);
assert.equal(result.body.calculatorContactsDeleted, 805);
assert.equal(result.body.calculatorContactsErased, true);
for (const path of ["leads/z-other", "leads/z-alias", "leads/z-no-email", "caContactRequests/keep", "users/other", "toolUsage/other"]) assert.ok(verified.data.has(path), path);
assert.equal(verified.data.has("users/owner"), false);
assert.equal(verified.data.has("savedResults/owner"), false);
assert.equal(verified.events.at(-1), "delete-auth");
result = await verified.invoke();
assert.equal(result.status, 200);
assert.equal(result.body.calculatorContactsDeleted, 0);

const unverified = harness({ verified: false });
result = await unverified.invoke();
assert.equal(result.status, 200);
assert.equal(result.body.calculatorContactsErased, false);
assert.ok(unverified.data.has("leads/0000"));
assert.equal(unverified.data.has("users/owner"), false);
assert.ok(!unverified.events.includes("scan:leads"));

const failure = harness({ failCommit: true });
assert.equal((await failure.invoke()).status, 500);
assert.ok(!failure.events.includes("delete-auth"));
assert.ok(failure.data.has("users/owner"));
assert.equal((await failure.invoke()).status, 200);
assert.equal((await harness({ failIdentity: true }).invoke()).status, 500);
console.log("PASS: current verified identity, 805 mixed-case legacy contacts, 1,650 account records in bounded batches, unrelated accounts/aliases/CA enquiries preserved, unverified-email handling, failure propagation and retry.");

const http = harness();
const app = express();
app.delete("/api/user/account", (req, res, next) => {
  if (req.get("Authorization") !== "Bearer synthetic-test") { res.status(401).end(); return; }
  (req as any).userId = "owner"; next();
}, http.handler);
const server = app.listen(0, "127.0.0.1");
await new Promise<void>(resolve => server.once("listening", resolve));
try {
  const endpoint = `http://127.0.0.1:${(server.address() as { port: number }).port}/api/user/account`;
  for (const [headers, expected] of [[[], "401"], [["-H", "Authorization: Bearer synthetic-test"], "200"]] as const) {
    const status = await new Promise<string>((resolve, reject) => execFile(process.platform === "win32" ? "curl.exe" : "curl", ["-sS", "-o", process.platform === "win32" ? "NUL" : "/dev/null", "-w", "%{http_code}", "-X", "DELETE", ...headers, endpoint], (error, stdout) => error ? reject(error) : resolve(stdout)));
    assert.equal(status, expected);
    console.log(`curl DELETE /api/user/account: ${status} (synthetic auth/storage)`);
  }
} finally { await new Promise<void>(resolve => server.close(() => resolve())); }
