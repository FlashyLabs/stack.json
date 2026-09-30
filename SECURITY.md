# Security

This repository holds a public index document, a JSON Schema and a
dependency-free checker. It runs no service, stores no data about anyone and
holds no credentials. The attack surface is the checker itself and the
truthfulness of the index.

## Reporting

Please report a vulnerability privately, not in a public issue.

- Email: **security@flashylabs** — *to be confirmed at launch; until the
  address is confirmed, a private report to the maintainers through GitHub's
  "Report a vulnerability" on this repository reaches the same people.*
- Include what you found, how to reproduce it, and which commit or branch you
  measured against.

You will get an acknowledgement, and we will say what we did — including when
it is worse than you reported.

## What counts

- A document that passes `vendor-stack.mjs check` but violates
  `stack.schema.json`, or the reverse. The two are meant to agree and a test
  says they do; a way to make them disagree is a real finding.
- A crafted `stack.json` that makes the checker hang, crash, or read outside
  the file it was given.
- An entry in the index that is false: a repository listed as public that is
  not, a contract claimed that was never published. This is an integrity issue
  and we treat it as one; the **Index correction** issue template is fine for
  it if it is not sensitive.

## What does not

- A repository listed here being private. The index maps what exists, not
  what a stranger can open.
- The licence. It is declared once, in the estate's register (flashyos
  `tools/estate-licences.mjs`); this repository is Apache-2.0, holder Flashy
  Labs, and carries the full text in `LICENSE`.

## Secrets

There are none here and there must never be. A committed credential is burned
the moment it lands and stays burned after the file is deleted, because history
keeps it. If you find one, report it as above and do not open an issue naming it.
