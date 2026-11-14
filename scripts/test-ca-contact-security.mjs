// Exercise the public contact handler without Firebase, SMTP, or a live user.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const handlers = new Map();
const sent = [];
const saved = [];
let profile = { status: 'approved', email: 'approved@example.com', fullName: 'Approved CA' };
const db = { collection: name => ({ doc: id => ({
  get: async () => ({ exists: name === 'caProfiles' && id === 'ca-1' && !!profile,
    data: () => profile }),
  set: async value => saved.push(value),
}) }) };
const source = readFileSync(new URL('../server/caRoutes.ts', import.meta.url), 'utf8');
const module = { exports: {} };
const escapeHtml = input => String(input ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
runInNewContext(ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
} }).outputText, {
  module, exports: module.exports, console, Date, Buffer, process,
  require: name => {
    if (name === 'express') return { Router: () => ({
      post: (path, ...fns) => handlers.set(`POST ${path}`, fns.at(-1)),
      get: () => {}, put: () => {}, patch: () => {},
    }) };
    if (name === './firebase') return { getFirestore: () => db, verifyFirebaseToken: async () => ({}) };
    if (name === './firestoreHelper') return { COLLECTIONS: {
      CA_PROFILES: 'caProfiles', CA_CONTACT_REQUESTS: 'caContactRequests',
    } };
    if (name === './emailService') return { sendEmail: async email => sent.push(email), escapeHtml };
    if (name === '@shared/schema') return { insertCAContactRequestSchema: {
      safeParse: data => ({ success: true, data }),
    }, insertCAProfileSchema: { safeParse: () => ({ success: false }) } };
    return require(name);
  },
});

const handler = handlers.get('POST /contact');
assert.ok(handler, 'Contact route must be registered');
const request = { body: { caId: 'ca-1', caName: 'Attacker', caEmail: 'attacker@example.com',
  userName: '<img src=x onerror=alert(1)>', userEmail: 'user@example.com',
  taxIssue: '<script>alert(1)</script> Please advise on tax.' } };
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; } });
const ok = response();
await handler(request, ok);
assert.equal(ok.statusCode, 201);
assert.equal(sent.length, 2);
assert.equal(sent[0].to[0].email, 'approved@example.com');
assert.equal(sent[1].subject, 'Your introduction request to Approved CA has been sent');
assert.equal(saved[0].caEmail, 'approved@example.com');
assert.equal(saved[0].caName, 'Approved CA');
for (const email of sent) {
  assert.ok(!email.htmlContent.includes('<script>'));
  assert.ok(!email.htmlContent.includes('<img src=x'));
  assert.ok(email.htmlContent.includes('&lt;'));
}
profile = { ...profile, status: 'pending' };
const blocked = response();
await handler(request, blocked);
assert.equal(blocked.statusCode, 404);
assert.equal(sent.length, 2);
assert.equal(saved.length, 1);
console.log('PASS: approved stored recipient, escaped email bodies, and pending CA rejection');

// Saved result routes are used to construct links in outgoing result emails.
const resultRecords = new Map();
const resultDb = { collection: () => ({ doc: id => ({
  get: async () => ({ exists: resultRecords.has(id), data: () => resultRecords.get(id) }),
  set: async value => resultRecords.set(id, value),
}) }) };
const resultModule = { exports: {} };
const resultSource = readFileSync(new URL('../server/savedResults.ts', import.meta.url), 'utf8');
runInNewContext(ts.transpileModule(resultSource, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
} }).outputText, {
  module: resultModule, exports: resultModule.exports, console, Date,
  require: name => {
    if (name === './firebase') return { getFirestore: () => resultDb };
    if (name === './emailService') return { sendCalculatorResultEmail: async () => {} };
    throw new Error(`Unexpected dependency: ${name}`);
  },
});
const resultInput = route => ({ toolKey: 'income-tax', toolName: 'Income tax', route,
  kind: 'calculator', headline: { label: 'Tax', value: '100' }, inputs: {} });
for (const [route, expected] of [
  ['/dashboard', '/dashboard'], ['//attacker.example', '/dashboard'],
  ['.attacker.example/path', '/dashboard'], ['/safe/path', '/safe/path'],
]) {
  await resultModule.exports.saveLastResult('test-user', resultInput(route));
  assert.equal([...resultRecords.values()].at(-1).route, expected);
}
console.log('PASS: saved result email links remain on the site');
