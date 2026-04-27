const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const {
  discoverAgents,
  discoverSkills,
  runAgentsCli,
  runSkillsCli,
} = require("../src/cli");

const packageRoot = path.resolve(__dirname, "..");

function createStream() {
  return {
    text: "",
    write(chunk) {
      this.text += chunk;
    },
  };
}

function createProjectDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "skills-cli-"));
}

async function runSkills(args, cwd = createProjectDir()) {
  const stdout = createStream();
  const stderr = createStream();
  const exitCode = await runSkillsCli(args, {
    cwd,
    packageRoot,
    stdout,
    stderr,
  });

  return {
    cwd,
    exitCode,
    stderr: stderr.text,
    stdout: stdout.text,
  };
}

async function runAgents(args, cwd = createProjectDir()) {
  const stdout = createStream();
  const stderr = createStream();
  const exitCode = await runAgentsCli(args, {
    cwd,
    packageRoot,
    stdout,
    stderr,
  });

  return {
    cwd,
    exitCode,
    stderr: stderr.text,
    stdout: stdout.text,
  };
}

test("discovers bundled skills and agents", () => {
  const skills = discoverSkills(packageRoot);
  const agents = discoverAgents(packageRoot);

  assert.equal(skills.length, 9);
  assert.deepEqual(
    skills.map((skill) => skill.slug),
    [
      "extract-enum",
      "purposeful-logging",
      "solid-typescript",
      "structure-types",
      "test-driven-development",
      "typescript-debugging",
      "use-types-structures",
      "extract-custom-hook",
      "react-avoid-use-effect",
    ]
  );

  assert.equal(agents.length, 8);
  assert.deepEqual(
    agents.map((agent) => agent.slug),
    [
      "architect",
      "code-architect",
      "code-reviewer",
      "code-simplifier",
      "database-reviewer",
      "tdd-guide",
      "typescript-debugger",
      "typescript-reviewer",
    ]
  );
});

test("installs one skill with the default OpenAI provider", async () => {
  const result = await runSkills(["add", "react-avoid-use-effect"]);
  const skillDir = path.join(result.cwd, "react-avoid-use-effect");

  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /Using provider: openai/);
  assert.ok(fs.existsSync(path.join(skillDir, "SKILL.md")));
  assert.ok(fs.existsSync(path.join(skillDir, "references", "you-might-not-need-an-effect.md")));
  assert.ok(fs.existsSync(path.join(skillDir, "agents", "openai.yaml")));
  assert.ok(!fs.existsSync(path.join(skillDir, "agents", "claude.md")));
  assert.ok(!fs.existsSync(path.join(result.cwd, ".codex")));
});

test("installs one skill with the Claude provider", async () => {
  const result = await runSkills(["add", "react-avoid-use-effect", "--provider", "claude"]);
  const skillDir = path.join(result.cwd, "react-avoid-use-effect");

  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /Using provider: claude/);
  assert.ok(fs.existsSync(path.join(skillDir, "SKILL.md")));
  assert.ok(fs.existsSync(path.join(skillDir, "agents", "claude.md")));
  assert.ok(!fs.existsSync(path.join(skillDir, "agents", "openai.yaml")));
});

test("installs all skills with -a", async () => {
  const result = await runSkills(["add", "-a"]);
  const destinationRoot = result.cwd;
  const installed = fs.readdirSync(destinationRoot).sort();

  assert.equal(result.exitCode, 0);
  assert.equal(installed.length, discoverSkills(packageRoot).length);
  assert.ok(installed.includes("extract-enum"));
  assert.ok(installed.includes("react-avoid-use-effect"));
});

test("installs one standalone agent", async () => {
  const result = await runAgents(["add", "code-reviewer"]);
  const agentPath = path.join(result.cwd, ".claude", "agents", "code-reviewer.md");

  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /Standalone agents are provider-independent/);
  assert.ok(fs.existsSync(agentPath));
});

test("installs all standalone agents with --all", async () => {
  const result = await runAgents(["add", "--all"]);
  const destinationRoot = path.join(result.cwd, ".claude", "agents");
  const installed = fs.readdirSync(destinationRoot).sort();

  assert.equal(result.exitCode, 0);
  assert.equal(installed.length, discoverAgents(packageRoot).length);
  assert.ok(installed.includes("architect.md"));
  assert.ok(installed.includes("typescript-reviewer.md"));
});

test("provider flag does not affect standalone agent install output", async () => {
  const result = await runAgents(["add", "code-reviewer", "--provider", "claude"]);

  assert.equal(result.exitCode, 0);
  assert.match(result.stdout, /Standalone agents are provider-independent; ignoring provider selection/);
  assert.ok(fs.existsSync(path.join(result.cwd, ".claude", "agents", "code-reviewer.md")));
  assert.ok(!fs.existsSync(path.join(result.cwd, ".codex")));
});

test("skills binary rejects the old nested agent command", async () => {
  const result = await runSkills(["agent", "add", "code-reviewer"]);

  assert.equal(result.exitCode, 1);
  assert.match(result.stderr, /Unknown command: agent/);
  assert.match(result.stderr, /npx -p @batoanng\/ai skills add/);
});

test("existing skill install is skipped unless forced", async () => {
  const cwd = createProjectDir();
  const first = await runSkills(["add", "extract-enum"], cwd);
  const skillFile = path.join(cwd, "extract-enum", "SKILL.md");

  assert.equal(first.exitCode, 0);
  fs.writeFileSync(skillFile, "local edit\n");

  const skipped = await runSkills(["add", "extract-enum"], cwd);
  assert.equal(skipped.exitCode, 0);
  assert.match(skipped.stdout, /Skipped extract-enum/);
  assert.equal(fs.readFileSync(skillFile, "utf8"), "local edit\n");

  const forced = await runSkills(["add", "extract-enum", "--force"], cwd);
  assert.equal(forced.exitCode, 0);
  assert.match(forced.stdout, /Installed extract-enum/);
  assert.notEqual(fs.readFileSync(skillFile, "utf8"), "local edit\n");
});

test("invalid skill slug exits non-zero with a useful message", async () => {
  const result = await runSkills(["add", "missing-skill"]);

  assert.equal(result.exitCode, 1);
  assert.match(result.stderr, /Skill not found: missing-skill/);
  assert.match(result.stderr, /Available skills:/);
});

test("invalid provider exits non-zero with a useful message", async () => {
  const result = await runSkills(["add", "extract-enum", "--provider", "unknown"]);

  assert.equal(result.exitCode, 1);
  assert.match(result.stderr, /Invalid provider "unknown"/);
  assert.match(result.stderr, /openai, claude/);
});
