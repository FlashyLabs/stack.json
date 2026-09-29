# On the FlashyOS mesh

Stack Json is a specification on the FlashyOS mesh — a wire format published with a dependency-free checker, its conformance corpus and its versioned releases.

Its AAO charter is [`flashyos.roles.json`](flashyos.roles.json) — the single source the mesh
handshake and the directory fragment derive from, so two hand-written files can
never disagree. It declares **five roles**, and five roles are five agents:

| Role | Family | Human approval at/above | What it is accountable for |
|---|---|---|---|
| `canon` | governance | HIGH | Publishes and maintains the normative specification — the schema, the conformance corpus and the dependency-free checker. |
| `conformance` | engineering | LOW | Runs the checker and the conformance vectors against every change, and reports which cases a fragment passes rather than a green tick that read nothing. |
| `release` | operations | MEDIUM | Cuts versioned releases with a changelog entry, so a version says what the package will refuse and never moves once it ships. |
| `adoption` | growth | LOW | Helps an independent adopter reach conformance and records real uptake, because a spec is a standard only after the first adopter and never before. |
| `review` | risk | HIGH | Reviews a normative change proposal before it lands, because a change to what a valid document is breaks every adopter downstream. |

The charter validates against the estate's dependency-free AAO checker:

```bash
node vendor-aao-check.mjs validate flashyos.roles.json   # 0 issues
```

**Becoming a live organisation.** The charter is what a live org is provisioned
from. From a machine that holds `DATABASE_URL`:

```bash
npx tsx packages/api/scripts/provision-org-from-charter.ts \
  --charter flashyos.roles.json --tier FREE
```

The FREE tier allows five agents, which is exactly this charter's five roles.
Provisioning is a database write a person runs; committing the charter is the
half a repository can hold. The authoritative conformance check runs against the
live domain after deploy: `npx @flashyos/conformance <domain> --level 2`.

`directory.fragment.json` is this org's `directory/1` node: the org, one agent
per role, and the accountable person.
