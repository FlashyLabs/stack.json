# stack.json — the machine-readable index of the Web 4 stack

One document, `stack.json`, contract `web4/1`: the whole agentic-internet
infrastructure map as an agent reads it, twin of the human hub
`FlashyLabs/web4`, served at `/.well-known/stack.json`. The schema is the
published contract, the checker is the code, and the tests hold the two
together.

## Commands

```bash
node vendor-stack.mjs check stack.json   # validate + lint; exit 1 on any finding
node vendor-stack.mjs list               # layer -> repo -> status -> visibility
npm run lint                             # node --check every .mjs, parse every .json
npm test                                 # node --test; must pass
```

No install. There are no dependencies and there must not be any: `vendor-*.mjs`
imports `node:` builtins only and a test refuses anything else.

## What makes this repository different

**The document reads as generated and is hand-measured.** `stack.json` looks
like the output of a survey tool, and one day it should be — but today every
`status` and `visibility` in it was read from GitHub by a person on the
`generated` date. That is the only honest way to fill it until a measurer
exists, and it has a cost: a status cannot be *edited*, it can only be
**re-measured**. If a repository goes public, private or live, read GitHub, then
change the value **and** the `generated` date **and** recopy
`vectors/valid-real-stack.json` (a test compares the bytes). A value typed from
memory is a guess wearing a measurement's clothes.

**`visibility` is what GitHub reports, never what was intended.** `bastion` is
`private-intended` and measured `public`, and both are recorded; the `x-note`
on it says so, and `lint()` refuses a private-intended public repository that
carries no note. Do not "fix" the document to say what somebody meant. The
repository is what gets fixed; the document follows the next measurement.

**A planned repository is `url: null`, `visibility: null`.** Not `""`, not a
URL that will 404, not `"private"`. `null` means *there is nothing to measure*,
and the lint refuses a planned repo with a visibility and a non-planned repo
without one. Null is never zero, and it is never a guess.

**The checker and the schema must agree, and a test proves it.**
`stack.schema.json` (draft 2020-12) is what a stranger reads;
`vendor-stack.mjs` is what runs, because no JSON-Schema library is allowed
here. `test/stack.test.mjs` compares the two on every enum, every pattern (by
source *and* by probe strings), every required and known key set, the `x-`
open-extension rule, and every vector in `vectors/`. Change one side and the
suite names the other. Never change only one.

**The closed set is closed.** `kind`, `status` and `visibility` are enums;
every object refuses unknown keys except `x-` prefixed ones. Adding a field is a
schema change, a checker change, a vector for the new failure shape, and an
entry in the test's `EXPECTED_CODE` map — the test refuses an invalid vector
whose expected code nobody wrote down, so a vector that fails for the wrong
reason cannot pass.

**`validate()` is the schema; `lint()` is what a schema cannot say.** Unique
names across the whole document, the exposure note, the planned/visibility
pairing — these live in `lint()` and are reported as `finding`, not `error`,
so a reader can tell whether a document is malformed or merely wrong. `check`
fails on either.

**No fabricated data, ever.** This repository's whole value is that the numbers
in it are the ones somebody read. A layer with an invented repo, a `contract`
nobody published, or a `wellKnown` path nothing serves is worse than an empty
field.

## Layout

| Path | What it is |
|---|---|
| `stack.json` | The document. Re-measured, never hand-edited for a status. |
| `stack.schema.json` | The contract, JSON Schema 2020-12. |
| `vendor-stack.mjs` | The checker and CLI. `node:` builtins only. |
| `vectors/` | `valid-*.json` and `invalid-*.json`; one named error code per invalid vector. |
| `test/stack.test.mjs` | The suite. |
| `.github/` | CI (lint + test, no install), issue and PR templates. |

## House rules — true in every repository in this estate

**`main` is not necessarily the default branch.** Ask, every time: `git symbolic-ref --short refs/remotes/origin/HEAD`.

**Say which branch you measured.** Reading the working tree tells you about your checkout, not the repository.

**Re-vendor before you trust a vendored change.** Files named `vendor-*.mjs` are byte-identical copies; a stale copy disagrees silently.

**No secret in a file, a repo, or an artifact.** Secret Manager only.

**The licence is declared once**, in `tools/estate-licences.mjs` in flashyos. Do not decide this repository's licence inside it.

**A generated file is regenerated, never hand-edited.**

**Report what happened, including when it is worse than expected.**
