## What this changes

<!-- One of: index correction / contract change / prose or tooling. -->

## If it corrects the index

- [ ] I measured the value (say how and when below), I did not type it from memory
- [ ] `generated` in `stack.json` is the date I measured
- [ ] `vectors/valid-real-stack.json` was recopied from `stack.json`
- [ ] Anything awkward is recorded as found, with an `x-note`

Measured on: <!-- date --> by: <!-- e.g. GitHub while signed out / gh repo view / fetching the well-known path -->

## If it changes the contract

- [ ] `stack.schema.json` changed
- [ ] `vendor-stack.mjs` changed to match
- [ ] a vector in `vectors/` exercises it, and its expected code is in `test/stack.test.mjs`
- [ ] no dependency was added

## Always

- [ ] `npm run lint` and `npm test` pass locally
- [ ] Branch measured against: <!-- `git symbolic-ref --short refs/remotes/origin/HEAD` -->
- [ ] No secret, token or credential anywhere in the diff
