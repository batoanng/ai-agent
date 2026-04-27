#!/usr/bin/env node

const path = require("node:path");
const { runSkillsCli } = require("../src/cli");

const packageRoot = path.resolve(__dirname, "..");

runSkillsCli(process.argv.slice(2), {
  cwd: process.cwd(),
  packageRoot,
  stdout: process.stdout,
  stderr: process.stderr,
}).then((exitCode) => {
  process.exitCode = exitCode;
});
