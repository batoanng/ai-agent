# ai-agent

`ai-agent` is a small prompt package that bundles reusable **skills** and **agents** for code-oriented AI workflows.

The repository is organized so you can keep higher-level agent personas separate from narrower, task-specific skills:

- `skills/` contains focused workflow packs with a `SKILL.md` entrypoint.
- `skills/<group>/<skill>/agents/openai.yaml` contains skill-level UI metadata and default prompts.
- `skills/<group>/<skill>/references/` contains optional supporting material used by the skill.
- `agents/` contains standalone agent guides for broader roles such as architecture, review, and simplification.
- `config.toml` contains the package-level execution limits.

## Package Structure

```text
.
├── agents/
├── config.toml
├── skills/
│   ├── general/
│   └── react/
└── README.md
```

## Skills

Skills are the narrowest unit in the package. Each skill describes:

- when to use it
- the workflow to follow
- decision rules and guardrails
- the expected output after the task is complete

Current bundled skills:

| Skill | Group | Purpose |
| --- | --- | --- |
| `extract-enum` | `general` | Refactor repeated domain literals into a shared string enum when runtime reuse matters. |
| `structure-types` | `general` | Organize and scale TypeScript types and interfaces by domain and reuse boundary. |
| `test-driven-development` | `general` | Drive implementation through a red-green-refactor workflow. |
| `typescript-debugging` | `general` | Debug TypeScript and JavaScript issues with verified source maps, intentional instrumentation, and root-cause-first fixes. |
| `use-types-structures` | `general` | Prefer existing data structures from `@batoanng/types` and justify complexity choices. |
| `react-avoid-use-effect` | `react` | Remove unnecessary React Effects and replace them with React-first patterns. |

### Skill Layout

Each skill folder follows the same shape:

```text
skills/<group>/<skill>/
├── SKILL.md
├── agents/
│   └── openai.yaml
└── references/
```

- `SKILL.md` is the canonical instruction file.
- `agents/openai.yaml` exposes lightweight interface metadata such as display name and default prompt.
- `references/` stores deeper guidance that the skill can point to without bloating the main instructions.

Example:

- [skills/react/react-avoid-use-effect/SKILL.md](/Users/batoannguyen/Downloads/PROJECTS/personal/ai-agent/skills/react/react-avoid-use-effect/SKILL.md)
- [skills/react/react-avoid-use-effect/agents/openai.yaml](/Users/batoannguyen/Downloads/PROJECTS/personal/ai-agent/skills/react/react-avoid-use-effect/agents/openai.yaml)

## Agents

Agents are broader role definitions than skills. They are useful when the model should adopt a persistent perspective across a larger task instead of applying one narrow workflow.

Current bundled agents:

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

See the bundled guides in [agents](/Users/batoannguyen/Downloads/PROJECTS/personal/ai-agent/agents).

## How Skills And Agents Fit Together

Use both layers together:

- Pick an **agent** when you need a broad working mode such as review, architecture, or TDD guidance.
- Pick a **skill** when you need a precise playbook for one coding problem.
- Combine them when helpful. For example, a reviewer agent can apply `react-avoid-use-effect` while assessing a React change.

In practice:

1. Select the broad role from `agents/` if the task needs one.
2. Apply one or more relevant skills from `skills/`.
3. Follow the workflow in `SKILL.md`.
4. Use any `references/` material only when the main skill file needs extra context.

## Configuration

The package currently exposes two top-level settings in [config.toml](/Users/batoannguyen/Downloads/PROJECTS/personal/ai-agent/config.toml):

```toml
max_threads = 4
max_depth = 1
```

- `max_threads` limits parallel work.
- `max_depth` limits delegation depth.

## Extending The Package

To add a new skill:

1. Create `skills/<group>/<skill>/SKILL.md`.
2. Add `skills/<group>/<skill>/agents/openai.yaml`.
3. Add `references/` only if the skill needs deeper source material.
4. Document the new skill in this README.

To add a new standalone agent:

1. Add a new Markdown guide under `agents/`.
2. Give it a clear role, scope, and operating checklist.
3. Document it in this README.
