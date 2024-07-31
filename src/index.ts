#!/usr/bin/env node

import { Command } from "commander";
import figlet from "figlet";
import omelette from "omelette";

import { setupConnectCommand } from "./connect/connectHandler.js";
// import { listDir } from './chfs/chfs.js';
import { FeedGroupHandler, FeedMemberHandler } from "./feeds/feedHandler.js";
import { PluginGroupHandler } from "./plugins/pluginHandler.js";
import { setupLfsCommand } from "./lfs/lfs.js";
import { setupFileBrowserCommand } from "./filesystem/filesystemHandler.js";

const program = new Command();

console.log(figlet.textSync("ChILI"));
console.log("The ChRIS Interactive Line Interface");

program.version("1.0.0").description("A CLI for ChRIS");

// Setup the subcommands
setupConnectCommand(program);
setupLfsCommand(program);
setupFileBrowserCommand(program);

const pluginGroupHandler = new PluginGroupHandler();
pluginGroupHandler.setupCommand(program);

const feedGroupHandler = new FeedGroupHandler();
feedGroupHandler.setupCommand(program);

const feedMemberHandler = new FeedMemberHandler();
feedMemberHandler.setupCommand(program);

const completion = omelette(`chili|chili`);
completion.tree({
  connect: ["--user", "--password"],
  lfs: ["ls", "mkdir", "touch"],
  plugins: {
    list: ["--page", "--fields", "--search"],
    info: ["<pluginId>"],
    fieldslist: [],
  },
  feeds: {
    list: ["--page", "--fields", "--search"],
    new: ["--name", "--path"],
    fieldslist: [],
  },
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
