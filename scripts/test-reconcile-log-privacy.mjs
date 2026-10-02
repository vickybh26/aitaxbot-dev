/**
 * Privacy regression guard: the reconciliation pipeline may log diagnostic
 * events, but never interpolated document/model data or provider errors.
 * Parse TypeScript rather than matching lines, so multi-line payloads count.
 * No credentials, production records, external calls, or document uploads.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

function unsafeLogs(source, filename) {
  const tree = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true);
  const failures = [];
  function visit(node) {
    if (ts.isCallExpression(node) &&
        (ts.isPropertyAccessExpression(node.expression) || ts.isElementAccessExpression(node.expression)) &&
        node.expression.expression.getText(tree) === 'console') {
      if (node.arguments.length !== 1 || !ts.isStringLiteral(node.arguments[0])) {
        const { line } = tree.getLineAndCharacterOfPosition(node.getStart(tree));
        failures.push(`${filename}:${line + 1}: log must contain one fixed string only`);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
  return failures;
}

// Guard against both success-path payloads and error-path disclosures.
for (const sample of [
  'console.log("Parsed", JSON.stringify(parsed));',
  'console.error("Failed", error);',
  'console.log(`Salary: ${salary}`);',
  'console.warn("Raw response: " + response);',
  'console["log"]("Fields", { pan, salary });',
  'console.log(\n "Fields",\n { salary }\n);',
]) {
  assert.equal(unsafeLogs(sample, 'fixture.ts').length, 1);
}
assert.deepEqual(unsafeLogs('console.error("[AIS] Extraction failed");', 'fixture.ts'), []);

const failures = [
  'server/taxReconcileService.ts',
  'server/taxReconcileRoutes.ts',
].flatMap(file => unsafeLogs(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), file));
assert.deepEqual(failures, [], failures.join('\n'));
console.log('PASS: reconciliation service and routes contain only fixed-string console diagnostics; 7 guard fixtures passed.');
