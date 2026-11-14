// Exercise the public AI route with a failed provider and no external calls.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const handlers = new Map();
const module = { exports: {} };
const source = readFileSync(new URL('../server/ragRoutes.ts', import.meta.url), 'utf8');
runInNewContext(ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
} }).outputText, {
  module, exports: module.exports, Date, Map, Set,
  console: { error: () => {} },
  require: name => {
    if (name === 'express') return { Router: () => ({
      post: (path, ...fns) => handlers.set(`POST ${path}`, fns.at(-1)),
      get: (path, ...fns) => handlers.set(`GET ${path}`, fns.at(-1)),
    }) };
    if (name === './ragService') return {
      runRAGQuery: async () => { throw new Error('Qdrant API key secret-provider-detail'); },
      checkRAGHealth: async () => ({}),
    };
    if (name === './aiAnswerEvaluator') return { evaluateAnswerPair: async () => ({}) };
    if (name === './aiReviewRetention') return { isAIReviewCurrent: () => true };
    if (name === './firebase') return { verifyFirebaseToken: async () => null, getFirestore: () => ({}) };
    throw new Error(`Unexpected dependency: ${name}`);
  },
});
const handler = handlers.get('POST /query');
assert.ok(handler, 'Public AI route must be registered');
const reply = { apiError(status, code, message) {
  this.status = status; this.code = code; this.message = message; return this;
} };
await handler({ headers: {}, socket: { remoteAddress: 'synthetic-rag-test' },
  body: { question: 'How does this tax work?' } }, reply);
assert.equal(reply.status, 500);
assert.equal(reply.code, 'AI_UNAVAILABLE');
assert.ok(!reply.message.includes('secret-provider-detail'));
assert.ok(!reply.message.includes('Qdrant API key'));
console.log('PASS: POST /api/ai/query returns 500 without provider error details (synthetic)');
