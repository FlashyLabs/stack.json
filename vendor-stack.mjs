#!/usr/bin/env node
// vendor-stack.mjs — the web4/1 checker.
//
// Dependency-free: node: builtins only, so a copy of this file runs anywhere
// Node 22 does with no install. It implements the rules that
// stack.schema.json publishes; test/stack.test.mjs asserts the two agree on
// every vector and on every enum and pattern, because a checker that drifts
// from its schema is two contracts with one name.
//
//   import { validate, lint } from './vendor-stack.mjs'
//   validate(doc) -> { valid, errors: [{ path, code, message }] }   (the schema, in code)
//   lint(doc)     -> { ok, findings: [{ path, code, message }] }    (rules a schema cannot say)
//
//   node vendor-stack.mjs check stack.json     validate + lint; exit 1 on any finding
//   node vendor-stack.mjs list  [stack.json]   layer -> repo -> status -> visibility

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

export const CONTRACT = 'web4/1';

export const KINDS = Object.freeze(['spec', 'impl', 'spec+impl', 'product', 'tooling', 'docs', 'hub', 'index']);
export const STATUSES = Object.freeze(['planned', 'draft', 'exists', 'private-intended']);
export const VISIBILITIES = Object.freeze(['public', 'private', null]);

export const PATTERNS = Object.freeze({
  generated: /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/,
  httpsUrl: /^https:\/\/[^\s]+$/,
  wellKnownPath: /^\/\.well-known\/[^\s]+$/,
  contractId: /^[a-z0-9-]+\/[0-9.]+$/,
  layerName: /^[a-z][a-z0-9-]*$/,
  extension: /^x-/,
});

const TOP_REQUIRED = ['contract', 'generated', 'hub', 'wellKnown', 'principle', 'layers', 'tooling', 'teaching'];
const TOP_KNOWN = new Set(TOP_REQUIRED);
const LAYER_REQUIRED = ['name', 'question', 'repos'];
const LAYER_KNOWN = new Set(LAYER_REQUIRED);
const REPO_REQUIRED = ['name', 'kind', 'status', 'visibility'];
const REPO_KNOWN = new Set([...REPO_REQUIRED, 'url', 'contract', 'wellKnown']);

/** The key sets, exported so a test can hold them against the schema. */
export const KEYS = Object.freeze({
  top: { required: TOP_REQUIRED, known: [...TOP_KNOWN] },
  layer: { required: LAYER_REQUIRED, known: [...LAYER_KNOWN] },
  repo: { required: REPO_REQUIRED, known: [...REPO_KNOWN] },
});

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isNonEmptyString = (v) => typeof v === 'string' && v.length > 0;

function unknownKeys(obj, known, path, errors) {
  for (const key of Object.keys(obj)) {
    if (known.has(key) || PATTERNS.extension.test(key)) continue;
    errors.push({ path: `${path}.${key}`, code: 'unknown-key', message: `unknown key "${key}" (only x- prefixed extensions are allowed)` });
  }
}

function missingKeys(obj, required, path, errors) {
  for (const key of required) {
    if (!(key in obj)) errors.push({ path: `${path}.${key}`, code: 'missing-field', message: `"${key}" is required` });
  }
}

function checkRepo(repo, path, errors) {
  if (!isObject(repo)) {
    errors.push({ path, code: 'bad-type', message: 'a repo must be an object' });
    return;
  }
  unknownKeys(repo, REPO_KNOWN, path, errors);
  missingKeys(repo, REPO_REQUIRED, path, errors);

  if ('name' in repo && !isNonEmptyString(repo.name)) {
    errors.push({ path: `${path}.name`, code: 'bad-type', message: 'name must be a non-empty string' });
  }
  if ('kind' in repo && !KINDS.includes(repo.kind)) {
    errors.push({ path: `${path}.kind`, code: 'bad-kind', message: `kind must be one of ${KINDS.join(' | ')}` });
  }
  if ('status' in repo && !STATUSES.includes(repo.status)) {
    errors.push({ path: `${path}.status`, code: 'bad-status', message: `status must be one of ${STATUSES.join(' | ')}` });
  }
  if ('visibility' in repo && !VISIBILITIES.includes(repo.visibility)) {
    errors.push({ path: `${path}.visibility`, code: 'bad-visibility', message: 'visibility must be public, private or null' });
  }
  if ('contract' in repo && !(typeof repo.contract === 'string' && PATTERNS.contractId.test(repo.contract))) {
    errors.push({ path: `${path}.contract`, code: 'bad-contract', message: 'contract must match <slug>/<version>, e.g. trust/1' });
  }
  if ('wellKnown' in repo && !(typeof repo.wellKnown === 'string' && PATTERNS.wellKnownPath.test(repo.wellKnown))) {
    errors.push({ path: `${path}.wellKnown`, code: 'bad-wellknown', message: 'wellKnown must start with /.well-known/' });
  }

  // url: string or null in general; required and a string unless planned.
  if ('url' in repo && repo.url !== null && !(typeof repo.url === 'string' && PATTERNS.httpsUrl.test(repo.url))) {
    errors.push({ path: `${path}.url`, code: 'bad-url', message: 'url must be an https:// URL or null' });
  }
  const planned = repo.status === 'planned';
  if (!planned) {
    if (!('url' in repo)) {
      errors.push({ path: `${path}.url`, code: 'url-required', message: 'url is required unless status is planned' });
    } else if (repo.url === null) {
      errors.push({ path: `${path}.url`, code: 'url-required', message: 'url may be null only when status is planned' });
    }
  }
}

function checkLayer(layer, path, errors) {
  if (!isObject(layer)) {
    errors.push({ path, code: 'bad-type', message: 'a layer must be an object' });
    return;
  }
  unknownKeys(layer, LAYER_KNOWN, path, errors);
  missingKeys(layer, LAYER_REQUIRED, path, errors);

  if ('name' in layer && !(typeof layer.name === 'string' && PATTERNS.layerName.test(layer.name))) {
    errors.push({ path: `${path}.name`, code: 'bad-type', message: 'layer name must be a lower-case slug' });
  }
  if ('question' in layer && !isNonEmptyString(layer.question)) {
    errors.push({ path: `${path}.question`, code: 'empty-question', message: 'question must be a non-empty string' });
  }
  if ('repos' in layer) {
    if (!Array.isArray(layer.repos)) {
      errors.push({ path: `${path}.repos`, code: 'bad-type', message: 'repos must be an array' });
    } else if (layer.repos.length === 0) {
      errors.push({ path: `${path}.repos`, code: 'no-repos', message: 'a layer needs at least one repo' });
    } else {
      layer.repos.forEach((repo, i) => checkRepo(repo, `${path}.repos[${i}]`, errors));
    }
  }
}

function checkRepoList(list, path, errors) {
  if (!Array.isArray(list)) {
    errors.push({ path, code: 'bad-type', message: `${path} must be an array` });
    return;
  }
  list.forEach((repo, i) => checkRepo(repo, `${path}[${i}]`, errors));
}

/** The schema, in code. Returns { valid, errors }. */
export function validate(doc) {
  const errors = [];
  if (!isObject(doc)) {
    return { valid: false, errors: [{ path: '$', code: 'bad-type', message: 'document must be an object' }] };
  }
  unknownKeys(doc, TOP_KNOWN, '$', errors);
  missingKeys(doc, TOP_REQUIRED, '$', errors);

  if ('contract' in doc && doc.contract !== CONTRACT) {
    errors.push({ path: '$.contract', code: 'bad-contract-version', message: `contract must be "${CONTRACT}"` });
  }
  if ('generated' in doc && !(typeof doc.generated === 'string' && PATTERNS.generated.test(doc.generated))) {
    errors.push({ path: '$.generated', code: 'bad-type', message: 'generated must be a YYYY-MM-DD date' });
  }
  if ('hub' in doc && !(typeof doc.hub === 'string' && PATTERNS.httpsUrl.test(doc.hub))) {
    errors.push({ path: '$.hub', code: 'bad-url', message: 'hub must be an https:// URL' });
  }
  if ('wellKnown' in doc && !(typeof doc.wellKnown === 'string' && PATTERNS.wellKnownPath.test(doc.wellKnown))) {
    errors.push({ path: '$.wellKnown', code: 'bad-wellknown', message: 'wellKnown must start with /.well-known/' });
  }
  if ('principle' in doc && !isNonEmptyString(doc.principle)) {
    errors.push({ path: '$.principle', code: 'bad-type', message: 'principle must be a non-empty string' });
  }
  if ('layers' in doc) {
    if (!Array.isArray(doc.layers)) {
      errors.push({ path: '$.layers', code: 'bad-type', message: 'layers must be an array' });
    } else if (doc.layers.length === 0) {
      errors.push({ path: '$.layers', code: 'no-layers', message: 'at least one layer is required' });
    } else {
      doc.layers.forEach((layer, i) => checkLayer(layer, `$.layers[${i}]`, errors));
    }
  }
  if ('tooling' in doc) checkRepoList(doc.tooling, '$.tooling', errors);
  if ('teaching' in doc) checkRepoList(doc.teaching, '$.teaching', errors);

  return { valid: errors.length === 0, errors };
}

/** Every repo in the document with its path, in document order. */
export function repos(doc) {
  const out = [];
  for (const [li, layer] of (doc?.layers ?? []).entries()) {
    for (const [ri, repo] of (layer?.repos ?? []).entries()) {
      if (isObject(repo)) out.push({ path: `$.layers[${li}].repos[${ri}]`, layer: layer.name, repo });
    }
  }
  for (const section of ['tooling', 'teaching']) {
    for (const [i, repo] of (doc?.[section] ?? []).entries()) {
      if (isObject(repo)) out.push({ path: `$.${section}[${i}]`, layer: section, repo });
    }
  }
  return out;
}

/**
 * Rules the schema cannot express. Run after validate() on a document that
 * validates; on one that does not, the findings are best-effort.
 */
export function lint(doc) {
  const findings = [];
  const seen = new Map();
  for (const { path, repo } of repos(doc)) {
    if (typeof repo.name === 'string') {
      if (seen.has(repo.name)) {
        findings.push({ path: `${path}.name`, code: 'duplicate-name', message: `repo "${repo.name}" already listed at ${seen.get(repo.name)}` });
      } else {
        seen.set(repo.name, path);
      }
    }
    if (repo.status === 'private-intended' && repo.visibility === 'public' && !isNonEmptyString(repo['x-note'])) {
      findings.push({ path, code: 'unexplained-exposure', message: `"${repo.name}" is private-intended but measured public; an x-note must say so` });
    }
    if (repo.status === 'planned' && repo.visibility !== null) {
      findings.push({ path: `${path}.visibility`, code: 'planned-with-visibility', message: `"${repo.name}" is planned, so it has no repository and no visibility to measure` });
    }
    if (repo.status !== 'planned' && repo.visibility === null) {
      findings.push({ path: `${path}.visibility`, code: 'unmeasured-visibility', message: `"${repo.name}" has a repository, so its visibility must be measured` });
    }
  }
  return { ok: findings.length === 0, findings };
}

/** A human table: layer -> repo -> status -> visibility. */
export function table(doc) {
  const rows = repos(doc).map(({ layer, repo }) => [
    layer,
    repo.name,
    repo.kind,
    repo.status,
    repo.visibility === null ? '—' : String(repo.visibility),
  ]);
  const head = ['layer', 'repo', 'kind', 'status', 'visibility'];
  const widths = head.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  const line = (cells) => cells.map((c, i) => c.padEnd(widths[i])).join('  ').trimEnd();
  return [line(head), line(widths.map((w) => '-'.repeat(w))), ...rows.map(line)].join('\n');
}

function readDoc(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (err) {
    process.stderr.write(`cannot read ${file}: ${err.message}\n`);
    process.exit(2);
  }
}

function usage() {
  process.stderr.write('usage: node vendor-stack.mjs check <stack.json>\n       node vendor-stack.mjs list [stack.json]\n');
  process.exit(2);
}

export function main(argv) {
  const [cmd, fileArg] = argv;
  if (cmd === 'check') {
    if (!fileArg) usage();
    const doc = readDoc(fileArg);
    const { valid, errors } = validate(doc);
    const { ok, findings } = lint(doc);
    for (const e of errors) process.stdout.write(`error    ${e.path}  ${e.code}  ${e.message}\n`);
    for (const f of findings) process.stdout.write(`finding  ${f.path}  ${f.code}  ${f.message}\n`);
    const n = repos(doc).length;
    if (valid && ok) {
      process.stdout.write(`${fileArg}: ${CONTRACT} valid — ${doc.layers.length} layers, ${n} repos, measured ${doc.generated}\n`);
      return 0;
    }
    process.stdout.write(`${fileArg}: ${errors.length} error(s), ${findings.length} finding(s)\n`);
    return 1;
  }
  if (cmd === 'list') {
    const doc = readDoc(fileArg ?? 'stack.json');
    process.stdout.write(`${table(doc)}\n`);
    return 0;
  }
  usage();
  return 2;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.exit(main(process.argv.slice(2)));
}
