#!/usr/bin/env node

import { Command } from "commander";
import figlet from "figlet";
import omelette from "omelette";

const program = new Command();

console.log(figlet.textSync("ChILI"));
console.log("The ChRIS Interactive Line Interface");

import { setupConnectCommand } from "./connect/connectHandler.js";
// import { listDir } from './chfs/chfs.js';
import { setupFeedCommand } from "./feed/feed.js";
import { setupLfsCommand } from "./lfs/lfs.js";

program.version("1.0.0").description("A CLI for ChRIS");

// Setup the subcommands
setupConnectCommand(program);
setupLfsCommand(program);
setupFeedCommand(program);

const completion = omelette(`chjs|chjs`);
completion.tree({
  connect: ["--user", "--password"],
  lfs: ["ls", "mkdir", "touch"],
});

completion.init();

if (~process.argv.indexOf("--completion")) {
  completion.setupShellInitFile();
}

program
  .option("-v, --verbose", "Enable verbose output")
  .option("-c, --config <path>", "Path to config file");

async function main() {
  program.parse(process.argv);

  const options = program.opts();

  // Handle global options
  if (options.verbose) {
    console.log("Verbose mode enabled");
  }

  if (options.config) {
    console.log(`Using config file: ${options.config}`);
  }
}

main().catch((error) => {
  console.error("An error occurred:", error);
  process.exit(1);
});
