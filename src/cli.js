const fs = require("node:fs");
const path = require("node:path");

const PROVIDERS = new Map([
  ["openai", "openai.yaml"],
  ["claude", "claude.md"],
]);

function writeLine(stream, message = "") {
  stream.write(`${message}\n`);
}

function pathExists(filePath) {
  return fs.existsSync(filePath);
}

function isDirectory(filePath) {
  try {
    return fs.statSync(filePath).isDirectory();
  } catch {
    return false;
  }
}

function removeIfExists(filePath) {
  if (pathExists(filePath)) {
    fs.rmSync(filePath, { recursive: true, force: true });
  }
}

function copyIfExists(source, destination) {
  if (!pathExists(source)) {
    return false;
  }

  fs.cpSync(source, destination, { recursive: true });
  return true;
}

function discoverSkills(packageRoot) {
  const skillsRoot = path.join(packageRoot, "skills");

  if (!isDirectory(skillsRoot)) {
    return [];
  }

  const skills = [];

  for (const groupName of fs.readdirSync(skillsRoot).sort()) {
    const groupPath = path.join(skillsRoot, groupName);

    if (!isDirectory(groupPath)) {
      continue;
    }

    for (const slug of fs.readdirSync(groupPath).sort()) {
      const skillPath = path.join(groupPath, slug);
      const entrypoint = path.join(skillPath, "SKILL.md");

      if (!isDirectory(skillPath) || !pathExists(entrypoint)) {
        continue;
      }

      skills.push({
        group: groupName,
        slug,
        sourcePath: skillPath,
      });
    }
  }

  return skills;
}

function discoverAgents(packageRoot) {
  const agentsRoot = path.join(packageRoot, "agents");

  if (!isDirectory(agentsRoot)) {
    return [];
  }

  return fs
    .readdirSync(agentsRoot)
    .filter((fileName) => fileName.endsWith(".md"))
    .sort()
    .map((fileName) => {
      const slug = fileName.slice(0, -".md".length);

      return {
        slug,
        sourcePath: path.join(agentsRoot, fileName),
      };
    });
}

function formatList(items) {
  return items.map((item) => item.slug).join(", ");
}

function parseInstallArgs(args, options = {}) {
  const result = {
    all: false,
    force: false,
    help: false,
    provider: "openai",
    providerProvided: false,
    slugs: [],
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "-a" || arg === "--all") {
      result.all = true;
      continue;
    }

    if (arg === "--force") {
      result.force = true;
      continue;
    }

    if (arg === "-h" || arg === "--help") {
      result.help = true;
      continue;
    }

    if (arg === "--provider") {
      const provider = args[index + 1];

      if (!provider || provider.startsWith("-")) {
        throw new Error("--provider requires a value.");
      }

      result.provider = provider;
      result.providerProvided = true;
      index += 1;
      continue;
    }

    if (arg.startsWith("--provider=")) {
      const provider = arg.slice("--provider=".length);

      if (!provider) {
        throw new Error("--provider requires a value.");
      }

      result.provider = provider;
      result.providerProvided = true;
      continue;
    }

    if (arg.startsWith("-")) {
      throw new Error(`Unknown flag: ${arg}`);
    }

    result.slugs.push(arg);
  }

  if (result.all && result.slugs.length > 0) {
    throw new Error("Use either a slug or --all, not both.");
  }

  if (!result.all && result.slugs.length > 1) {
    throw new Error("Install one item at a time, or use --all.");
  }

  if (options.validateProvider && !PROVIDERS.has(result.provider)) {
    throw new Error(
      `Invalid provider "${result.provider}". Expected one of: ${Array.from(PROVIDERS.keys()).join(", ")}.`
    );
  }

  return result;
}

function getBySlug(items, slug) {
  return items.find((item) => item.slug === slug);
}

function installSkill(skill, options) {
  const providerFile = PROVIDERS.get(options.provider);
  const providerSource = path.join(skill.sourcePath, "agents", providerFile);

  if (!pathExists(providerSource)) {
    throw new Error(`Skill "${skill.slug}" does not include provider file agents/${providerFile}.`);
  }

  const destination = path.join(options.cwd, ".codex", "skills", skill.slug);

  if (pathExists(destination) && !options.force) {
    return {
      action: "skipped",
      destination,
      slug: skill.slug,
    };
  }

  if (options.force) {
    removeIfExists(destination);
  }

  fs.mkdirSync(destination, { recursive: true });
  fs.copyFileSync(path.join(skill.sourcePath, "SKILL.md"), path.join(destination, "SKILL.md"));
  copyIfExists(path.join(skill.sourcePath, "references"), path.join(destination, "references"));

  const agentsDestination = path.join(destination, "agents");
  fs.mkdirSync(agentsDestination, { recursive: true });
  fs.copyFileSync(providerSource, path.join(agentsDestination, providerFile));

  return {
    action: "installed",
    destination,
    slug: skill.slug,
  };
}

function installAgent(agent, options) {
  const destination = path.join(options.cwd, ".claude", "agents", `${agent.slug}.md`);

  if (pathExists(destination) && !options.force) {
    return {
      action: "skipped",
      destination,
      slug: agent.slug,
    };
  }

  if (options.force) {
    removeIfExists(destination);
  }

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(agent.sourcePath, destination);

  return {
    action: "installed",
    destination,
    slug: agent.slug,
  };
}

function printSkillHelp(stdout) {
  writeLine(stdout, "Usage:");
  writeLine(stdout, "  npx -p @batoanng/ai skills add <skill-slug> [--provider openai|claude] [--force]");
  writeLine(stdout, "  npx -p @batoanng/ai skills add -a [--provider openai|claude] [--force]");
  writeLine(stdout, "");
  writeLine(stdout, "Default skill provider: openai");
}

function printAgentHelp(stdout) {
  writeLine(stdout, "Usage:");
  writeLine(stdout, "  npx -p @batoanng/ai agents add <agent-slug> [--force]");
  writeLine(stdout, "  npx -p @batoanng/ai agents add -a [--force]");
  writeLine(stdout, "");
  writeLine(stdout, "Standalone agents are provider-independent.");
}

function printSkillsRootHelp(stdout) {
  writeLine(stdout, "Usage:");
  writeLine(stdout, "  npx -p @batoanng/ai skills add <skill-slug>");
  writeLine(stdout, "  npx -p @batoanng/ai skills add -a");
  writeLine(stdout, "");
  writeLine(stdout, "Skill provider defaults to openai. Use --provider claude for Claude skill references.");
}

function printAgentsRootHelp(stdout) {
  writeLine(stdout, "Usage:");
  writeLine(stdout, "  npx -p @batoanng/ai agents add <agent-slug>");
  writeLine(stdout, "  npx -p @batoanng/ai agents add -a");
  writeLine(stdout, "");
  writeLine(stdout, "Standalone agents are provider-independent.");
}

function reportInstallResults(stdout, results) {
  for (const result of results) {
    if (result.action === "skipped") {
      writeLine(stdout, `Skipped ${result.slug}: already exists at ${result.destination}. Use --force to replace it.`);
      continue;
    }

    writeLine(stdout, `Installed ${result.slug} to ${result.destination}.`);
  }
}

async function runSkillsCli(args, options) {
  const context = {
    cwd: options.cwd,
    packageRoot: options.packageRoot,
    stdout: options.stdout,
    stderr: options.stderr,
  };

  try {
    if (args.length === 0 || args[0] === "-h" || args[0] === "--help") {
      printSkillsRootHelp(context.stdout);
      return 0;
    }

    if (args[0] === "add") {
      return runSkillAdd(args.slice(1), context);
    }

    writeLine(context.stderr, `Unknown command: ${args[0]}`);
    printSkillsRootHelp(context.stderr);
    return 1;
  } catch (error) {
    writeLine(context.stderr, error.message);
    return 1;
  }
}

function runSkillAdd(args, context) {
  const parsed = parseInstallArgs(args, { validateProvider: true });

  if (parsed.help) {
    printSkillHelp(context.stdout);
    return 0;
  }

  if (!parsed.all && parsed.slugs.length === 0) {
    printSkillHelp(context.stderr);
    return 1;
  }

  writeLine(context.stdout, `Using provider: ${parsed.provider}`);

  const skills = discoverSkills(context.packageRoot);
  const selected = parsed.all ? skills : [getBySlug(skills, parsed.slugs[0])].filter(Boolean);

  if (selected.length === 0) {
    writeLine(context.stderr, `Skill not found: ${parsed.slugs[0]}`);
    writeLine(context.stderr, `Available skills: ${formatList(skills)}`);
    return 1;
  }

  const results = selected.map((skill) =>
    installSkill(skill, {
      cwd: context.cwd,
      force: parsed.force,
      provider: parsed.provider,
    })
  );

  reportInstallResults(context.stdout, results);
  return 0;
}

async function runAgentsCli(args, options) {
  const context = {
    cwd: options.cwd,
    packageRoot: options.packageRoot,
    stdout: options.stdout,
    stderr: options.stderr,
  };

  try {
    if (args.length === 0 || args[0] === "-h" || args[0] === "--help") {
      printAgentsRootHelp(context.stdout);
      return 0;
    }

    if (args[0] === "add") {
      return runAgentAdd(args.slice(1), context);
    }

    writeLine(context.stderr, `Unknown command: ${args[0]}`);
    printAgentsRootHelp(context.stderr);
    return 1;
  } catch (error) {
    writeLine(context.stderr, error.message);
    return 1;
  }
}

function runAgentAdd(args, context) {
  const parsed = parseInstallArgs(args, { validateProvider: false });

  if (parsed.help) {
    printAgentHelp(context.stdout);
    return 0;
  }

  if (!parsed.all && parsed.slugs.length === 0) {
    printAgentHelp(context.stderr);
    return 1;
  }

  writeLine(context.stdout, "Standalone agents are provider-independent; ignoring provider selection.");

  const agents = discoverAgents(context.packageRoot);
  const selected = parsed.all ? agents : [getBySlug(agents, parsed.slugs[0])].filter(Boolean);

  if (selected.length === 0) {
    writeLine(context.stderr, `Agent not found: ${parsed.slugs[0]}`);
    writeLine(context.stderr, `Available agents: ${formatList(agents)}`);
    return 1;
  }

  const results = selected.map((agent) =>
    installAgent(agent, {
      cwd: context.cwd,
      force: parsed.force,
    })
  );

  reportInstallResults(context.stdout, results);
  return 0;
}

module.exports = {
  discoverAgents,
  discoverSkills,
  installAgent,
  installSkill,
  parseInstallArgs,
  runAgentsCli,
  runCli: runSkillsCli,
  runSkillsCli,
};
