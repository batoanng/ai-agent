# ai-agent

`ai-agent` is a prompt package for installing reusable AI coding **skills** and **agents** into a project.

- Use a **skill** for a focused workflow, such as removing unnecessary React Effects, debugging TypeScript, or applying TDD.
- Use an **agent** for a broader working role, such as code review, architecture, or simplification.
- Install one item when a project needs a specific workflow. Install all items when bootstrapping a project with the full prompt toolkit.

## Install With `@batoanng/ai`

The package exposes separate `skills` and `agents` commands through the `@batoanng/ai` npm package:

```bash
npx -p @batoanng/ai skills add <skill-slug>
npx -p @batoanng/ai skills add -a
npx -p @batoanng/ai agents add <agent-slug>
npx -p @batoanng/ai agents add -a
```

## Installing Skills

Install one skill into the current project:

```bash
npx -p @batoanng/ai skills add react-avoid-use-effect
```

Install every bundled skill:

```bash
npx -p @batoanng/ai skills add -a
```

Skills are installed directly under the current folder:

```text
./<skill-slug>/
```

To install into Codex's project-local skill folder, run the command from `.codex/skills`.

Each skill install includes `SKILL.md`, any supporting `references/`, and one provider-specific reference file.

### Provider Selection

Skill installs default to OpenAI:

```bash
npx -p @batoanng/ai skills add react-avoid-use-effect
```

The CLI logs the selected provider on every skill install:

```text
Using provider: openai
```

To install the Claude reference instead:

```bash
npx -p @batoanng/ai skills add react-avoid-use-effect --provider claude
```

Available providers:

| Provider | Included skill reference |
| --- | --- |
| `openai` | `agents/openai.yaml` |
| `claude` | `agents/claude.md` |

## Installing Agents

Install one standalone agent:

```bash
npx -p @batoanng/ai agents add code-reviewer
```

Install every bundled agent:

```bash
npx -p @batoanng/ai agents add -a
```

Agents are installed to:

```text
.claude/agents/<agent-slug>.md
```

Standalone agents are provider-independent. If `--provider` is passed to an agent command, the install still writes the same agent file and logs that provider selection is ignored.

## Updating Existing Installs

Existing installed skills and agents are skipped by default so local edits are preserved:

```text
Skipped react-avoid-use-effect: already exists at ./react-avoid-use-effect. Use --force to replace it.
```

Use `--force` to replace an existing install with the packaged version:

```bash
npx -p @batoanng/ai skills add react-avoid-use-effect --force
npx -p @batoanng/ai agents add code-reviewer --force
```

## Bundled Skills

| Skill | Group | Purpose |
| --- | --- | --- |
| `extract-enum` | `general` | Refactor repeated domain literals into a shared string enum when runtime reuse matters. |
| `purposeful-logging` | `general` | Add, review, and reduce logs so each line has diagnostic value and the right signals become metrics or spans. |
| `solid-typescript` | `general` | Apply practical SOLID pressure tests to TypeScript design without adding ceremony. |
| `structure-types` | `general` | Organize and scale TypeScript types and interfaces by domain and reuse boundary. |
| `test-driven-development` | `general` | Drive implementation through a red-green-refactor workflow. |
| `typescript-debugging` | `general` | Debug TypeScript and JavaScript issues with verified source maps, intentional instrumentation, and root-cause-first fixes. |
| `use-types-structures` | `general` | Prefer existing data structures from the `@batoanng/types` npm package and justify complexity choices. |
| `extract-custom-hook` | `react` | Refactor duplicated React stateful logic into a focused custom Hook. |
| `react-avoid-use-effect` | `react` | Remove unnecessary React Effects and replace them with React-first patterns. |

## Bundled Agents

| Agent | Purpose |
| --- | --- |
| `architect` | System design, scalability, and architecture trade-off analysis. |
| `code-architect` | Feature-level implementation blueprints based on existing codebase patterns. |
| `code-reviewer` | General code review for correctness, maintainability, and security. |
| `code-simplifier` | Behavior-preserving simplification and cleanup of recently changed code. |
| `database-reviewer` | Cross-database review for PostgreSQL, MySQL, and MongoDB with one consistent checklist for performance, schema, security, and operations. |
| `tdd-guide` | Tests-first implementation guidance and coverage discipline. |
| `typescript-debugger` | Debug TypeScript and JavaScript failures through reproduction, source-map validation, targeted instrumentation, and verified fixes. |
| `typescript-reviewer` | TypeScript/JavaScript-focused review with emphasis on type safety and async correctness. |

## Package Layout

```text
.
├── agents/
├── bin/
├── config.toml
├── skills/
│   ├── general/
│   └── react/
├── src/
├── test/
├── README.md
└── SPECS.md
```

Skill source folders follow this shape:

```text
skills/<group>/<skill>/
├── SKILL.md
├── agents/
│   ├── claude.md
│   └── openai.yaml
└── references/
```

- `SKILL.md` is the canonical skill instruction file.
- `agents/openai.yaml` is the OpenAI-facing skill reference.
- `agents/claude.md` is the Claude-facing skill reference.
- `references/` stores deeper supporting material used by the skill.

Standalone agent guides live in `agents/`.

## Configuration

The package currently includes top-level execution limits in `config.toml`:

```toml
max_threads = 4
max_depth = 1
```

## Development

Run the test suite:

```bash
npm test
```

See `SPECS.md` for the technical CLI contract.

## Extending The Package

To add a new skill:

1. Create `skills/<group>/<skill>/SKILL.md`.
2. Add `skills/<group>/<skill>/agents/openai.yaml`.
3. Add `skills/<group>/<skill>/agents/claude.md`.
4. Add `references/` only if the skill needs deeper source material.
5. Document the new skill in this README.

To add a new standalone agent:

1. Add a new Markdown guide under `agents/`.
2. Give it a clear role, scope, and operating checklist.
3. Document it in this README.
