#!/usr/bin/env node

import { Command } from "commander";
import figlet from "figlet";
import omelette from "omelette";

import { setupConnectCommand } from "./connect/connectHandler.js";
import { FeedGroupHandler, FeedMemberHandler } from "./feeds/feedHandler.js";
import { PluginGroupHandler } from "./plugins/pluginHandler.js";
import { PluginMetaGroupHandler } from "./plugins/pluginMetaHandler.js";
import { setupInodeCommand } from "./filesystem/inodeCommand.js";
import { setupFileBrowserCommand } from "./filesystem/filesystemHandler.js";
import { chrisConnection } from "@fnndsc/cumin";

const program = new Command();

program.version("1.0.0").description("A CLI for ChRIS");

function setupCommandCompletion() {
  const completion = omelette(`chili|chili`);
  completion.tree({
    connect: ["--user", "--password"],
    lfs: ["ls", "mkdir", "touch"],
    plugins: {
      list: ["--page", "--fields", "--search"],
      info: ["<pluginId>"],
      fieldslist: [],
      delete: ["<IDs>", "--search", "--force"],
    },
    feeds: {
      list: ["--page", "--fields", "--search"],
      new: ["--name", "--path"],
      fieldslist: [],
      delete: ["<IDs>", "--search", "--force"],
    },
    inode: {
      "<path>": {
        files: {
          list: ["--page", "--fields", "--search"],
          fieldslist: [],
          delete: ["<IDs>", "--search", "--force"],
          share: ["--force"],
        },
        file: {
          view: ["--type"],
        },
      },
    },
  });

  completion.init();

  if (~process.argv.indexOf("--completion")) {
    completion.setupShellInitFile();
  }
}

async function setupOtherCommands() {
  // Check if we have a valid ChRIS connection
  const client = chrisConnection.getClient();
  if (!client) {
    console.error(
      "Not connected to ChRIS. Please use the 'connect' command first."
    );
    process.exit(1);
  }

  // Setup other commands here
  setupFileBrowserCommand(program);
  await setupInodeCommand(program);

  const pluginGroupHandler = new PluginGroupHandler();
  pluginGroupHandler.setupCommand(program);

  const pluginMetaGroupHandler = new PluginMetaGroupHandler();
  pluginMetaGroupHandler.setupCommand(program);

  const feedGroupHandler = new FeedGroupHandler();
  feedGroupHandler.setupCommand(program);

  const feedMemberHandler = new FeedMemberHandler();
  feedMemberHandler.setupCommand(program);

  // Setup command completion
  setupCommandCompletion();
}

async function main() {
  // Setup basic program info
  program
    .option("-v, --verbose", "enable verbose output")
    .option("-c, --config <path>", "path to config file")
    .option("-s, --nosplash", "disable splash screen");

  // Setup connect command early
  setupConnectCommand(program);

  // Parse arguments to check if it's a connect command
  program.parseOptions(process.argv);
  const options = program.opts();

  if (!options.nosplash) {
    console.log(figlet.textSync("ChILI"));
    console.log("The ChRIS Interactive Line Interface");
  }

  // Handle global options
  if (options.verbose) {
    console.log("Verbose mode enabled");
  }

  if (options.config) {
    console.log(`Using config file: ${options.config}`);
  }

  // If it's not a connect command, setup other commands
  if (!process.argv.includes("connect")) {
    await setupOtherCommands();
  }
  program
    .option(
      "--context <context>",
      "Specify the ChRIS context URL and/or unextpath"
    )
    .hook("preAction", (thisCommand, actionCommand) => {
      const context = thisCommand.opts().context;
      if (context) {
        // Set the context for the ChRIS connection
        chrisConnection.setContext(context);
      }
    });
  // Re-parse arguments to handle the selected command
  program.parse(process.argv);
}

main().catch((error) => {
  console.error("An error occurred:", error);
  process.exit(1);
});
