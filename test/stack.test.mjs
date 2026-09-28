// test/stack.test.mjs — node --test, node: builtins only.
//
// Three things are pinned here: the committed stack.json is a valid web4/1
// document; every vector behaves as its name says; and the checker agrees
// with the schema on every enum, pattern, key set and vector, so the file a
// stranger reads and the code that checks it cannot quietly become two
// different contracts.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  CONTRACT, KINDS, STATUSES, VISIBILITIES, PATTERNS, KEYS,
  validate, lint, repos, table,
} from '../vendor-stack.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHECKER = join(ROOT, 'vendor-stack.mjs');
const readJson = (rel) => JSON.parse(readFileSync(join(ROOT, rel), 'utf8'));

const stack = readJson('stack.json');
const schema = readJson('stack.schema.json');
const vectorDir = join(ROOT, 'vectors');
const vectorFiles = readdirSync(vectorDir).filter((f) => f.endsWith('.json')).sort();

// The one error code each invalid vector exists to produce. A vector that
// fails for some other reason is a broken vector, not a passing test.
const EXPECTED_CODE = {
  'invalid-bad-kind.json': 'bad-kind',
  'invalid-bad-status.json': 'bad-status',
  'invalid-bad-visibility.json': 'bad-visibility',
  'invalid-bad-contract-format.json': 'bad-contract',
  'invalid-url-missing-not-planned.json': 'url-required',
  'invalid-wellknown-not-prefixed.json': 'bad-wellknown',
  'invalid-unknown-key.json': 'unknown-key',
  'invalid-empty-question.json': 'empty-question',
  'invalid-layer-no-repos.json': 'no-repos',
  'invalid-wrong-contract.json': 'bad-contract-version',
};

// ---------------------------------------------------------------- the document

test('the committed stack.json is a valid web4/1 document', () => {
  const { valid, errors } = validate(stack);
  assert.deepEqual(errors, []);
  assert.equal(valid, true);
  assert.equal(stack.contract, CONTRACT);
});

test('the committed stack.json carries no lint finding', () => {
  const { ok, findings } = lint(stack);
  assert.deepEqual(findings, []);
  assert.equal(ok, true);
});

test('every repo name in stack.json is unique across layers, tooling and teaching', () => {
  const names = repos(stack).map(({ repo }) => repo.name);
  const dupes = names.filter((n, i) => names.indexOf(n) !== i);
  assert.deepEqual(dupes, [], `duplicate repo names: ${dupes.join(', ')}`);
  assert.ok(names.length >= 30, `expected the full estate, found ${names.length} repos`);
});

test('every layer has a non-empty question and at least one repo', () => {
  assert.ok(stack.layers.length >= 1);
  for (const layer of stack.layers) {
    assert.equal(typeof layer.question, 'string', `${layer.name}: question must be a string`);
    assert.ok(layer.question.trim().length > 0, `${layer.name}: question is empty`);
    assert.ok(Array.isArray(layer.repos) && layer.repos.length >= 1, `${layer.name}: needs a repo`);
  }
});

test('the nine layers are present, in order, each phrased as a question', () => {
  assert.deepEqual(
    stack.layers.map((l) => l.name),
    ['identity', 'graph', 'discovery', 'trust', 'gateway', 'representation', 'execution', 'commerce', 'audit'],
  );
  for (const layer of stack.layers) assert.ok(layer.question.endsWith('?'), `${layer.name}: "${layer.question}"`);
});

test('a repo that is private-intended but measured public says so in an x-note', () => {
  const exposed = repos(stack).filter(({ repo }) => repo.status === 'private-intended' && repo.visibility === 'public');
  assert.ok(exposed.length >= 1, 'bastion is expected to be in this state as of 2026-09-28');
  for (const { repo } of exposed) {
    assert.equal(typeof repo['x-note'], 'string', `${repo.name} needs an x-note`);
    assert.ok(repo['x-note'].length > 20, `${repo.name}: x-note must explain, not just exist`);
  }
  assert.ok(exposed.some(({ repo }) => repo.name === 'bastion'));
});

test('a planned repo has no url and no visibility; every other repo has both', () => {
  for (const { repo } of repos(stack)) {
    if (repo.status === 'planned') {
      assert.equal(repo.url ?? null, null, `${repo.name}: planned but carries a url`);
      assert.equal(repo.visibility, null, `${repo.name}: planned but carries a visibility`);
    } else {
      assert.match(repo.url, PATTERNS.httpsUrl, `${repo.name}: needs a url`);
      assert.ok(['public', 'private'].includes(repo.visibility), `${repo.name}: visibility must be measured`);
    }
  }
});

test('every url points at the FlashyLabs organisation on GitHub', () => {
  for (const { repo } of repos(stack)) {
    if (repo.url === null || repo.url === undefined) continue;
    assert.ok(repo.url.startsWith('https://github.com/FlashyLabs/'), `${repo.name}: ${repo.url}`);
    assert.equal(repo.url, `https://github.com/FlashyLabs/${repo.name}`, `${repo.name}: url does not match its name`);
  }
});

test('the hub field names the web4 repository the teaching section lists', () => {
  const hub = repos(stack).find(({ repo }) => repo.kind === 'hub');
  assert.ok(hub, 'a hub entry is expected');
  assert.equal(hub.repo.url, stack.hub);
});

test('vectors/valid-real-stack.json is byte-identical to stack.json', () => {
  assert.equal(
    readFileSync(join(vectorDir, 'valid-real-stack.json'), 'utf8'),
    readFileSync(join(ROOT, 'stack.json'), 'utf8'),
    'the vector is a copy; recopy it when stack.json changes',
  );
});

// ------------------------------------------------------------------- vectors

test('the vector set is large enough to mean something', () => {
  const valid = vectorFiles.filter((f) => f.startsWith('valid-'));
  const invalid = vectorFiles.filter((f) => f.startsWith('invalid-'));
  assert.ok(valid.length >= 3, `need >=3 valid vectors, found ${valid.length}`);
  assert.ok(invalid.length >= 6, `need >=6 invalid vectors, found ${invalid.length}`);
  assert.deepEqual(vectorFiles, [...invalid, ...valid].sort());
});

test('every vector is named valid- or invalid- and every invalid one has an expected code', () => {
  for (const f of vectorFiles) {
    assert.ok(f.startsWith('valid-') || f.startsWith('invalid-'), `${f}: name must declare its verdict`);
    if (f.startsWith('invalid-')) assert.ok(EXPECTED_CODE[f], `${f}: add its expected code to EXPECTED_CODE`);
  }
  for (const f of Object.keys(EXPECTED_CODE)) assert.ok(vectorFiles.includes(f), `${f} listed but missing on disk`);
});

for (const f of vectorFiles) {
  const doc = JSON.parse(readFileSync(join(vectorDir, f), 'utf8'));
  if (f.startsWith('valid-')) {
    test(`vector ${f} validates and lints clean`, () => {
      const { valid, errors } = validate(doc);
      assert.deepEqual(errors, []);
      assert.equal(valid, true);
      assert.deepEqual(lint(doc).findings, []);
    });
  } else {
    test(`vector ${f} is refused with ${EXPECTED_CODE[f]}`, () => {
      const { valid, errors } = validate(doc);
      assert.equal(valid, false);
      assert.ok(errors.length >= 1);
      const codes = errors.map((e) => e.code);
      assert.ok(codes.includes(EXPECTED_CODE[f]), `expected ${EXPECTED_CODE[f]}, got ${codes.join(', ')}`);
      for (const e of errors) {
        assert.match(e.path, /^\$/, 'every error names a JSON path');
        assert.ok(e.message.length > 0);
      }
    });
  }
}

test('the url rule is exactly "required unless planned"', () => {
  const doc = JSON.parse(readFileSync(join(vectorDir, 'invalid-url-missing-not-planned.json'), 'utf8'));
  const { errors } = validate(doc);
  const paths = errors.filter((e) => e.code === 'url-required').map((e) => e.path).sort();
  // repos[0] has no url, repos[1] has url null, repos[2] is planned and is fine.
  assert.deepEqual(paths, ['$.layers[0].repos[0].url', '$.layers[0].repos[1].url']);
  assert.ok(!errors.some((e) => e.path.startsWith('$.layers[0].repos[2]')), 'a planned repo without a url is valid');
});

// ------------------------------------------------ the schema and the checker agree

const repoSchema = schema.$defs.repo;
const layerSchema = schema.$defs.layer;

test('schema and checker agree on the closed enums', () => {
  assert.deepEqual(repoSchema.properties.kind.enum, [...KINDS]);
  assert.deepEqual(repoSchema.properties.status.enum, [...STATUSES]);
  assert.deepEqual(repoSchema.properties.visibility.enum, [...VISIBILITIES]);
  assert.equal(schema.properties.contract.const, CONTRACT);
});

test('schema and checker agree on every pattern, by behaviour and by source', () => {
  const pairs = [
    ['generated', schema.properties.generated.pattern, ['2026-09-28', '2026-9-28', '28/09/2026', '']],
    ['httpsUrl', schema.$defs.httpsUrl.pattern, ['https://github.com/FlashyLabs/x', 'http://x.y', 'https://a b', 'github.com/x', '']],
    ['wellKnownPath', schema.$defs.wellKnownPath.pattern, ['/.well-known/agent', '/.well-known/x.json', '/well-known/x', '/.well-known/', 'x', '']],
    ['contractId', schema.$defs.contractId.pattern, ['trust/1', 'aao/0.1', 'action-ledger/1', 'Trust/1', 'trust v1', 'trust/', '/1', 'trust/1a']],
    ['layerName', layerSchema.properties.name.pattern, ['identity', 'spec-and-impl', 'Identity', '9lives', '']],
  ];
  for (const [name, pattern, probes] of pairs) {
    const fromSchema = new RegExp(pattern);
    assert.equal(fromSchema.source, PATTERNS[name].source, `${name}: pattern source differs`);
    for (const probe of probes) {
      assert.equal(fromSchema.test(probe), PATTERNS[name].test(probe), `${name}: disagree on ${JSON.stringify(probe)}`);
    }
  }
});

test('schema and checker agree on required and known keys at every level', () => {
  const known = (s) => Object.keys(s.properties).sort();
  assert.deepEqual([...schema.required].sort(), [...KEYS.top.required].sort());
  assert.deepEqual(known(schema), [...KEYS.top.known].sort());
  assert.deepEqual([...layerSchema.required].sort(), [...KEYS.layer.required].sort());
  assert.deepEqual(known(layerSchema), [...KEYS.layer.known].sort());
  assert.deepEqual([...repoSchema.required].sort(), [...KEYS.repo.required].sort());
  assert.deepEqual(known(repoSchema), [...KEYS.repo.known].sort());
  // The conditional: url is required unless status is planned.
  assert.deepEqual(repoSchema.if.properties.status, { const: 'planned' });
  assert.deepEqual(repoSchema.else.required, ['url']);
});

test('schema closes every object except for x- extensions, as the checker does', () => {
  for (const [label, s] of [['top', schema], ['layer', layerSchema], ['repo', repoSchema]]) {
    assert.equal(s.additionalProperties, false, `${label}: additionalProperties must be false`);
    assert.deepEqual(Object.keys(s.patternProperties), ['^x-'], `${label}: only x- is open`);
    assert.equal(new RegExp('^x-').source, PATTERNS.extension.source);
  }
  const { valid, errors } = validate({ ...stack, 'x-anything': { nested: true } });
  assert.equal(valid, true, JSON.stringify(errors));
});

test('the schema declares draft 2020-12 and a wellKnown path the checker also accepts', () => {
  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  assert.match(stack.wellKnown, PATTERNS.wellKnownPath);
  assert.equal(stack.wellKnown, '/.well-known/stack.json');
});

// ------------------------------------------------------------------- the CLI

const run = (...args) => spawnSync(process.execPath, [CHECKER, ...args], { cwd: ROOT, encoding: 'utf8' });

test('node vendor-stack.mjs check stack.json exits 0 and says so', () => {
  const r = run('check', 'stack.json');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /web4\/1 valid/);
  assert.match(r.stdout, /measured 2026-09-28/);
});

test('node vendor-stack.mjs check <invalid vector> prints the finding and exits 1', () => {
  const r = run('check', 'vectors/invalid-bad-kind.json');
  assert.equal(r.status, 1);
  assert.match(r.stdout, /bad-kind/);
  assert.match(r.stdout, /\$\.layers\[0\]\.repos\[0\]\.kind/);
});

test('node vendor-stack.mjs check refuses an unreadable file with exit 2', () => {
  const r = run('check', 'vectors/does-not-exist.json');
  assert.equal(r.status, 2);
  assert.match(r.stderr, /cannot read/);
});

test('node vendor-stack.mjs list prints layer -> repo -> status -> visibility for every repo', () => {
  const r = run('list');
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout.trimEnd(), table(stack));
  for (const { layer, repo } of repos(stack)) {
    const row = r.stdout.split('\n').find((l) => l.split(/\s{2,}/).includes(repo.name));
    assert.ok(row, `${repo.name} missing from the table`);
    assert.ok(row.startsWith(layer), `${repo.name}: wrong layer column`);
    assert.ok(row.includes(repo.status), `${repo.name}: status missing`);
    assert.ok(row.includes(repo.visibility ?? '—'), `${repo.name}: visibility missing`);
  }
});

test('the lint catches a duplicate name and an unexplained exposure', () => {
  const dupe = structuredClone(stack);
  dupe.tooling.push({ ...dupe.tooling[0] });
  assert.ok(lint(dupe).findings.some((f) => f.code === 'duplicate-name'));

  const exposed = structuredClone(stack);
  const bastion = exposed.layers.find((l) => l.name === 'gateway').repos.find((r) => r.name === 'bastion');
  delete bastion['x-note'];
  assert.ok(lint(exposed).findings.some((f) => f.code === 'unexplained-exposure'));
});

test('the checker imports node: builtins only', () => {
  const src = readFileSync(CHECKER, 'utf8');
  const specifiers = [...src.matchAll(/^import\s.*?from\s+'([^']+)'/gm)].map((m) => m[1]);
  assert.ok(specifiers.length > 0);
  for (const s of specifiers) assert.ok(s.startsWith('node:'), `non-builtin import: ${s}`);
});
