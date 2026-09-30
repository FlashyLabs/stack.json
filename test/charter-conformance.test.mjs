// test/charter-conformance.test.mjs — node --test, node: builtins only.
//
// MESH.md documents `node vendor-aao-check.mjs validate flashyos.roles.json`
// as the way this org's AAO charter is checked. For that command to be more
// than prose, the checker has to be in the tree and the charter has to pass
// it. This suite pins both, and pins that the vendored checker has not drifted
// from its canonical source in the aao repository.
//
// `vendor-aao-check.mjs` is a byte-identical copy of the aao repository's
// `vendor-aao-check.mjs`. Re-vendor, never edit; the drift test below compares
// the copy against a checkout beside this repository and reports UNKNOWN —
// never a pass — when there is nothing to compare against.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateCharterDocument, conform } from '../vendor-aao-check.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const VENDORED = 'vendor-aao-check.mjs';
const SOURCE = join(ROOT, '..', 'aao', VENDORED);
const CHARTER_PATH = 'flashyos.roles.json';

const loadCharter = () => JSON.parse(readFileSync(join(ROOT, CHARTER_PATH), 'utf8'));

test('the committed charter validates as an AAO charter document — zero issues', () => {
  const issues = validateCharterDocument(loadCharter());
  assert.deepEqual(
    issues,
    [],
    `${CHARTER_PATH} fails aao validate:\n  ${issues.map((i) => `${i.path}: ${i.message}`).join('\n  ')}`,
  );
});

test('every static conformance question passes; the live ones are deferred, never claimed', () => {
  const report = conform(loadCharter());
  assert.ok(
    report.ok,
    `aao conform failed: ${JSON.stringify(report.issues)} ${JSON.stringify(report.results.filter((r) => r.status === 'fail'))}`,
  );
  for (const r of report.results) {
    assert.ok(
      r.status === 'pass' || (r.kind === 'live' && r.status === 'deferred'),
      `${r.id} is ${r.status}`,
    );
  }
});

test('the charter declares exactly the five roles MESH.md names, each working in this repository', () => {
  const c = loadCharter();
  assert.deepEqual(
    c.roles.map((r) => r.name),
    ['canon', 'conformance', 'release', 'adoption', 'review'],
    'the charter roles must match the five the MESH.md table describes',
  );
  const repoNames = new Set(c.repositories.map((r) => r.name));
  for (const role of c.roles) {
    for (const w of role.worksIn ?? []) {
      assert.ok(repoNames.has(w), `role "${role.name}" works in "${w}", which is not a declared repository`);
    }
  }
  const covered = new Set(c.roles.flatMap((r) => r.worksIn ?? []));
  for (const r of repoNames) assert.ok(covered.has(r), `no role works in "${r}"`);
  assert.ok(
    c.repositories.some((r) => r.url === 'github.com/FlashyLabs/stack.json'),
    'the charter does not name the repository it lives in',
  );
});

test('the vendored checker imports nothing but node: builtins', () => {
  const src = readFileSync(join(ROOT, VENDORED), 'utf8');
  for (const [, spec] of src.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
    assert.ok(spec.startsWith('node:'), `${VENDORED} imports "${spec}"`);
  }
});

test('the vendored checker matches the aao source byte for byte, when it is beside us', (t) => {
  if (!existsSync(SOURCE)) {
    t.diagnostic(`../aao is not checked out beside this repository — ${VENDORED} drift status UNKNOWN, not current`);
    return;
  }
  assert.ok(
    readFileSync(join(ROOT, VENDORED)).equals(readFileSync(SOURCE)),
    `${VENDORED} has drifted from ../aao/${VENDORED} — re-vendor, never edit`,
  );
});
