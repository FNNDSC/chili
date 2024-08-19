#!/usr/bin/env node

import { Command } from "commander";
import figlet from "figlet";
import omelette from "omelette";

import { setupConnectCommand } from "./connect/connectHandler.js";
import { FeedGroupHandler, FeedMemberHandler } from "./feeds/feedHandler.js";
import { PluginGroupHandler } from "./plugins/pluginHandler.js";
import { PluginMetaGroupHandler } from "./plugins/pluginMetaHandler.js";
import { setupInodeCommand } from "./filesystem/inodeCommand.js";
import { setupContextCommand } from "./context/contextCommand.js";
import { setupHostCommand } from "./host/hostCommand.js";
import { setupFileBrowserCommand } from "./filesystem/filesystemHandler.js";
import { chrisConnection } from "@fnndsc/cumin";
import { FileGroupHandler } from "./filesystem/fileGroupHandler.js";

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

async function initializeHandlers() {
  const client = chrisConnection.getClient();
  if (!client) {
    console.error(
      "Not connected to ChRIS. Please use the 'connect' command first."
    );
    process.exit(1);
  }

  setupFileBrowserCommand(program);
  setupContextCommand(program);
  setupHostCommand(program);
  await setupInodeCommand(program);

  const pluginGroupHandler: PluginGroupHandler = new PluginGroupHandler();
  pluginGroupHandler.setupCommand(program);

  const pluginMetaGroupHandler: PluginMetaGroupHandler =
    new PluginMetaGroupHandler();
  pluginMetaGroupHandler.setupCommand(program);

  const feedGroupHandler: FeedGroupHandler = new FeedGroupHandler();
  feedGroupHandler.setupCommand(program);

  const feedMemberHandler: FeedMemberHandler = new FeedMemberHandler();
  feedMemberHandler.setupCommand(program);

  const filesGroupHandler: FileGroupHandler = await FileGroupHandler.create(
    "files"
  );
  filesGroupHandler.setupCommand(program);

  const linksGroupHandler: FileGroupHandler = await FileGroupHandler.create(
    "links"
  );
  linksGroupHandler.setupCommand(program);

  const dirsGroupHandler: FileGroupHandler = await FileGroupHandler.create(
    "dirs"
  );
  dirsGroupHandler.setupCommand(program);

  setupCommandCompletion();
}

async function main() {
  program
    .option("-v, --verbose", "enable verbose output")
    .option("-c, --config <path>", "path to config file")
    .option("-s, --nosplash", "disable splash screen")
    .option(
      "--context <context>",
      "specify the ChRIS context: username, url, folderpath, feed, etc"
    );

  setupConnectCommand(program);

  // Parse arguments to handle global options and context
  program.parseOptions(process.argv);
  const options = program.opts();

  if (!options.nosplash) {
    console.log(figlet.textSync("ChILI"));
    console.log("The ChRIS Interactive Line Interface");
  }

  if (options.verbose) {
    console.log("Verbose mode enabled");
  }

  if (options.config) {
    console.log(`Using config file: ${options.config}`);
  }

  // Set context if provided
  if (options.context) {
    chrisConnection.setContext(options.context);
  }

  // If it's not a connect command, initialize other handlers
  if (!process.argv.includes("connect")) {
    await initializeHandlers();
  }

  // Re-parse arguments to handle the selected command
  program.parse(process.argv);
}

main().catch((error) => {
  console.error("An error occurred:", error);
  process.exit(1);
});
