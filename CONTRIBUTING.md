# Contributing

Thank you for reading this far. This repository holds one document and the
machinery that keeps it honest, so most contributions are one of three kinds.

## 1. Correcting the index

The most valuable change is a correction: a status or visibility that is no
longer what `stack.json` says, a repository that now exists, a contract that
was published or renamed.

- **Measure first.** Read the repository on GitHub, or run the check against
  the live surface. Say in the pull request *what you read and when*. A
  correction from memory is not a correction.
- Change the value, bump `generated` to the date you measured, and recopy the
  vector: `cp stack.json vectors/valid-real-stack.json`. A test compares the
  bytes.
- If the truth is awkward — a repository that is private-intended and public,
  a planned spec that has a URL but no content — record it as found and add an
  `x-note`. The document records disagreements; it does not resolve them.
- Use the **Index correction** issue template if you cannot open a pull
  request.

## 2. Changing the contract

`web4/1` is closed: enums, required keys, no unknown properties except `x-`.
A change to it is a change to three files and a fourth that proves it:

1. `stack.schema.json` — the published contract.
2. `vendor-stack.mjs` — the checker, which must implement the same rule.
3. `vectors/` — a `valid-*.json` or `invalid-*.json` that exercises the new
   rule, and the expected error code added to `EXPECTED_CODE` in
   `test/stack.test.mjs`.
4. `npm test` green: the agreement tests will name whichever side you forgot.

Something the schema cannot express (uniqueness, cross-field pairing) goes in
`lint()`, reported as a finding, with a test.

Do not add a dependency. The checker imports `node:` builtins only and a test
refuses anything else; the whole point of a vendorable checker is that a copy
runs anywhere Node 22 does with no install.

## 3. Everything else

Prose, templates, CI. Keep the README's final two lines (the status line and the
licence line) as they are; the licence is declared in the estate register in
flashyos, not here.

## Before you open a pull request

```bash
npm run lint
npm test
node vendor-stack.mjs check stack.json
```

Say which branch you measured against. `main` is not necessarily the default
branch in this estate: `git symbolic-ref --short refs/remotes/origin/HEAD`.

No secrets, no credentials, no tokens in any file. Ever.
