// test/mesh-references.test.mjs — node --test, node: builtins only.
//
// MESH.md pointed at `node vendor-aao-check.mjs validate flashyos.roles.json`
// while `vendor-aao-check.mjs` was absent from the tree — the exact
// referenced-but-missing defect this estate polices, a command a reader runs
// and gets "cannot find module". This suite makes such a dangling reference a
// red test: every local file MESH.md links to, every script a `node` command
// in it names, and every bare repository-local filename it mentions must
// actually exist here.
//
// Out of scope by construction: references that run somewhere else. MESH.md
// documents `npx tsx packages/api/scripts/provision-org-from-charter.ts`
// (a flashyos path, run from a machine that holds DATABASE_URL) and
// `npx @flashyos/conformance` (an npm package) — neither is a file this
// repository ships, so neither is asserted here. A local filename has no
// slash and an npm/scoped/pathed reference does, which is how they are told
// apart.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const mesh = readFileSync(join(ROOT, 'MESH.md'), 'utf8');

const isLocalLink = (t) => !/^(https?:|mailto:|#)/.test(t) && !t.includes('://');
// A repository-local filename: a bare name (no slash), ending in a shipped
// extension. `packages/api/…ts` and `@flashyos/conformance` both carry a slash
// and are excluded; `<domain>` and `--tier` carry no extension and are excluded.
const isLocalFile = (t) => /^[\w][\w.-]*\.(json|mjs|md|ts|js)$/.test(t);

const codeLines = () => {
  const lines = [];
  let inFence = false;
  for (const line of mesh.split('\n')) {
    if (/^\s*```/.test(line)) { inFence = !inFence; continue; }
    if (inFence) lines.push(line);
  }
  return lines;
};

test('every relative link in MESH.md resolves to a file in the repository', () => {
  const targets = [...mesh.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)].map((m) => m[1]).filter(isLocalLink);
  assert.ok(targets.length >= 1, 'MESH.md is expected to link at least the charter');
  for (const t of targets) {
    assert.ok(existsSync(join(ROOT, t)), `MESH.md links [..](${t}) but that path does not exist`);
  }
});

test('every `node <script>` command in MESH.md names a script that exists', () => {
  const scripts = codeLines()
    .map((l) => l.match(/^\s*node\s+(\S+)/))
    .filter(Boolean)
    .map((m) => m[1]);
  assert.ok(scripts.length >= 1, 'MESH.md is expected to document at least one node command');
  assert.ok(scripts.includes('vendor-aao-check.mjs'), 'the aao validate command is expected to be documented');
  for (const s of scripts) {
    assert.ok(existsSync(join(ROOT, s)), `MESH.md runs "node ${s}" but ${s} is not in the tree`);
  }
});

test('every bare repository-local filename mentioned anywhere in MESH.md exists', () => {
  // Tokens split on whitespace, backticks, parentheses, commas and pipes —
  // enough to isolate a filename from prose, code or a markdown link.
  const tokens = mesh.split(/[\s`(),|]+/).filter(isLocalFile);
  const seen = [...new Set(tokens)];
  assert.ok(seen.includes('flashyos.roles.json'), 'the charter filename is expected to appear');
  assert.ok(seen.includes('vendor-aao-check.mjs'), 'the checker filename is expected to appear');
  for (const f of seen) {
    assert.ok(existsSync(join(ROOT, f)), `MESH.md mentions "${f}" but it is not in the tree`);
  }
});
