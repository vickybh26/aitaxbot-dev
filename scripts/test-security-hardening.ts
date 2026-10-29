import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import express from "express";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createJsonBodyParser, createFormBodyParser } from "../server/requestBodyParsers";

const app = express();
app.use(createJsonBodyParser(), createFormBodyParser());
app.post("/api/webhook/whatsapp", (req, res) => res.json({
  body: req.body, raw: (req as any).rawBody?.toString("utf8"),
}));
app.post("/test", (req, res) => res.json(req.body));
app.use((error: any, _req: any, res: any, _next: any) => res.status(error.status || 500).end());
const server = app.listen(0, "127.0.0.1");
await new Promise<void>(resolve => server.once("listening", resolve));
const address = server.address();
assert.ok(address && typeof address !== "string");
const base = `http://127.0.0.1:${address.port}`;
try {
  const raw = '{ "test": true }';
  const webhook = await fetch(base + "/api/webhook/whatsapp", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: raw,
  });
  assert.equal(webhook.status, 200);
  assert.deepEqual(await webhook.json(), { body: { test: true }, raw });
  for (const type of ["application/json", "application/x-www-form-urlencoded"]) {
    const compressed = await fetch(base + "/test", {
      method: "POST", headers: { "Content-Type": type, "Content-Encoding": "gzip" },
      body: gzipSync(type === "application/json" ? raw : "test=true"),
    });
    assert.equal(compressed.status, 415);
  }
  const form = await fetch(base + "/test", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "test=ok",
  });
  assert.deepEqual(await form.json(), { test: "ok" });
  const oversized = await fetch(base + "/test", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value: "x".repeat(1024 * 1024) }),
  });
  assert.equal(oversized.status, 413);
  const resolver = zodResolver(z.object({ name: z.string().min(1) }));
  const options = { fields: {}, shouldUseNativeValidation: false };
  assert.deepEqual((await resolver({ name: "Valid" }, {}, options)).values, { name: "Valid" });
  assert.ok((await resolver({ name: "" }, {}, options)).errors.name);
  const source = readFileSync("server/index.ts", "utf8");
  const manifest = JSON.parse(readFileSync("package.json", "utf8"));
  const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
  const nodeVersion = readFileSync(".node-version", "utf8").trim();
  assert.equal(nodeVersion, "24.22.2");
  assert.equal(manifest.engines.node, ">=24.22.2 <25");
  assert.equal(lock.packages[""].engines.node, manifest.engines.node);
  assert.ok(readFileSync("Dockerfile", "utf8").includes(`FROM node:${nodeVersion}-bookworm-slim`));
  assert.ok(source.indexOf('app.use("/api", apiLimiter)') < source.indexOf("app.use(createJsonBodyParser())"));
  const accounting = readFileSync("server/accountingRoutes.ts", "utf8");
  assert.ok(!accounting.includes('console.log("Creating firm with data:"'));
  for (const directory of [".local-backups", "test-fixtures", "tmp"]) {
    assert.ok(readFileSync(".dockerignore", "utf8").split(/\r?\n/).includes(directory));
  }
  console.log("PASS: request limits, compressed-body rejection, webhook bytes, Zod 4 resolver, middleware order, log and Docker guards");
} finally {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}
