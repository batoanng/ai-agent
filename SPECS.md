# `@batoanng/ai` CLI Technical Specification

This package exposes two executables: `skills` and `agents`.

## CLI Grammar

```text
npx -p @batoanng/ai skills add <skill-slug> [--provider openai|claude] [--force]
npx -p @batoanng/ai skills add -a|--all [--provider openai|claude] [--force]

npx -p @batoanng/ai agents add <agent-slug> [--force]
npx -p @batoanng/ai agents add -a|--all [--force]
```

Help commands:

```text
skills --help
skills add --help
agents --help
agents add --help
```

## Flags And Defaults

| Flag | Commands | Default | Behavior |
| --- | --- | --- | --- |
| `-a`, `--all` | `skills add`, `agents add` | `false` | Installs every discovered skill or agent. Cannot be combined with a slug. |
| `--force` | `skills add`, `agents add` | `false` | Replaces an existing destination. Without it, existing installs are skipped. |
| `--provider openai\|claude` | `skills add` | `openai` | Selects which provider-specific skill reference file is copied. |

`--provider` only applies to `skills add`. `agents add` installs are provider-independent and log that provider selection is ignored.

## Discovery Rules

Skills are discovered from:

```text
skills/<group>/<skill-slug>/SKILL.md
```

A directory is installable as a skill when it has a `SKILL.md` file. The skill slug is the final directory name.

Standalone agents are discovered from:

```text
agents/<agent-slug>.md
```

The agent slug is the filename without `.md`.

## Install Outputs

Skill installs write to the current working directory:

```text
.codex/skills/<skill-slug>/
├── SKILL.md
├── agents/
│   └── openai.yaml OR claude.md
└── references/
```

The selected provider controls only the file copied into `agents/`:

| Provider | Source file | Destination file |
| --- | --- | --- |
| `openai` | `skills/<group>/<slug>/agents/openai.yaml` | `.codex/skills/<slug>/agents/openai.yaml` |
| `claude` | `skills/<group>/<slug>/agents/claude.md` | `.codex/skills/<slug>/agents/claude.md` |

Agent installs write to:

```text
.claude/agents/<agent-slug>.md
```

## Conflict Handling

If the destination already exists:

- Without `--force`, the CLI skips that item and exits successfully.
- With `--force`, the CLI removes the existing destination and copies the packaged source again.

## Logging

Skill installs always log the selected provider, including the default:

```text
Using provider: openai
```

Agent installs log:

```text
Standalone agents are provider-independent; ignoring provider selection.
```

Each item then logs whether it was installed or skipped.

## Exit Codes

| Exit code | Meaning |
| --- | --- |
| `0` | Command completed, including no-op skips for existing destinations. |
| `1` | Invalid command, invalid flag, invalid provider, missing slug, missing package asset, or unknown skill/agent slug. |

## Runtime Constraints

- The CLI uses Node.js built-ins only.
- Minimum Node.js version is 18.
- Installs are project-local relative to `process.cwd()`.
