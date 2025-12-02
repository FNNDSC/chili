#!/usr/bin/env node

import { Command } from "commander";
import figlet from "figlet";
import omelette from "omelette";

import { connectCommand_setup } from "./connect/connectHandler.js";
import { FeedGroupHandler, FeedMemberHandler } from "./feeds/feedHandler.js";
import {
  PluginGroupHandler,
  PluginMemberHandler,
} from "./plugins/pluginHandler.js";
import { PluginMetaGroupHandler } from "./plugins/pluginMetaHandler.js";
import { PluginContextGroupHandler } from "./plugins/pluginGroupHandler.js";
import { inodeCommand_setup } from "./filesystem/inodeCommand.js";
import { contextCommand_setup } from "./context/contextCommand.js";
import { pathCommand_setup } from "./path/pathCommand.js";
import { fileBrowserCommand_setup } from "./filesystem/filesystemHandler.js";
import { manCommand_setup } from "./man/man.js";
import { chefsCommand_setup } from "./chefs/chefs.js";
import { chrisConnection, chrisConnection_init, NodeStorageProvider, errorStack_getAllOfType } from "@fnndsc/cumin";
import { FileGroupHandler } from "./filesystem/fileGroupHandler.js";
import { screen, table_display } from "./screen/screen.js";

const program = new Command();

program.version("1.0.1").description("A CLI for ChRIS");

/**
 * Sets up command completion for the ChILI CLI using omelette.
 * This provides auto-completion suggestions in the shell.
 */
function commandCompletion_setup() {
  const completion = omelette(`chili|chili`);
  completion.tree({
    connect: ["--user", "--password"],
    man: {
      doc: [], // We'll populate this later with actual topics
    },
    chefs: ["ls", "mkdir", "touch"],
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

  completion.on("man.doc", ({ reply }) => {
    console.log("Autocomplete triggered for man doc command");
    // We'll implement actual topic retrieval here later
    reply([]);
  });

  completion.init();

  if (~process.argv.indexOf("--completion")) {
    completion.setupShellInitFile();
  }
}

/**
 * Initializes and sets up all command handlers for the ChILI CLI.
 *
 * @param program - The Commander.js program instance.
 */
async function handlers_initialize() {
  // const client = await chrisConnection.client_get(); 
  // We don't enforce connection here to allow --help to work. 
  // Commands will fail individually if not connected.

  fileBrowserCommand_setup(program);
  contextCommand_setup(program);
  pathCommand_setup(program);
  manCommand_setup(program);
  chefsCommand_setup(program);
  await inodeCommand_setup(program);

  const pluginGroupHandler: PluginGroupHandler = new PluginGroupHandler();
  pluginGroupHandler.pluginGroupCommand_setup(program);

  const pluginMetaGroupHandler: PluginMetaGroupHandler =
    new PluginMetaGroupHandler();
  pluginMetaGroupHandler.pluginMetaGroupCommand_setup(program);

  const feedGroupHandler: FeedGroupHandler = new FeedGroupHandler();
  feedGroupHandler.feedGroupCommand_setup(program);

  const feedMemberHandler: FeedMemberHandler = new FeedMemberHandler();
  feedMemberHandler.feedCommand_setup(program);

  const pluginMemberHandler: PluginMemberHandler = new PluginMemberHandler();
  pluginMemberHandler.pluginCommand_setup(program);

  try {
    const filesGroupHandler: FileGroupHandler = await FileGroupHandler.handler_create(
      "files"
    );
    filesGroupHandler.fileGroupCommand_setup(program);

    const linksGroupHandler: FileGroupHandler = await FileGroupHandler.handler_create(
      "links"
    );
    linksGroupHandler.fileGroupCommand_setup(program);

    const dirsGroupHandler: FileGroupHandler = await FileGroupHandler.handler_create(
      "dirs"
    );
    dirsGroupHandler.fileGroupCommand_setup(program);
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    const errors = errorStack_getAllOfType("error");
    const warnings = errorStack_getAllOfType("warning");
    console.log(`Note: File group commands (files, dirs, links) are unavailable. Reason: ${err}`);
    if (errors.length > 0) {
        console.log("Errors:");
        errors.forEach(msg => console.log(`  - ${msg}`));
    }
    if (warnings.length > 0) {
        console.log("Warnings:");
        warnings.forEach(msg => console.log(`  - ${msg}`));
    }
  }

  try {
    const computesOfPluginHandler: PluginContextGroupHandler =
      await PluginContextGroupHandler.handler_create("computesofplugin");
    computesOfPluginHandler.pluginContextGroupCommand_setup(program);

    const pluginInstancesHandler: PluginContextGroupHandler =
      await PluginContextGroupHandler.handler_create("instancesofplugin");
    pluginInstancesHandler.pluginContextGroupCommand_setup(program);

    const pluginParametersHandler: PluginContextGroupHandler =
      await PluginContextGroupHandler.handler_create("parametersofplugin");
    pluginParametersHandler.pluginContextGroupCommand_setup(program);
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    const errors = errorStack_getAllOfType("error");
    const warnings = errorStack_getAllOfType("warning");
    console.log(`Note: Plugin context commands are unavailable. Reason: ${err}`);
    if (errors.length > 0) {
        console.log("Errors:");
        errors.forEach(msg => console.log(`  - ${msg}`));
    }
    if (warnings.length > 0) {
        console.log("Warnings:");
        warnings.forEach(msg => console.log(`  - ${msg}`));
    }
  }

  commandCompletion_setup();
}

/**
 * Parses the command line arguments to extract context information.
 *
 * @param args - The command line arguments array (process.argv).
 * @returns A tuple containing the context string (if found) and the remaining arguments.
 */
function context_parse(args: string[]): [string | undefined, string[]] {
  if (args.length > 2 && args[2].includes("=")) {
    const context: string = args[2];
    return [context, [args[0], args[1], ...args.slice(3)]];
  }
  return [undefined, args];
}

/**
 * Main function to run the ChILI CLI.
 * Handles initialization, context parsing, and command execution.
 */
async function main() {
  // Initialize storage provider and ChrisConnection
  const nodeStorageProvider = new NodeStorageProvider();
  const connection = await chrisConnection_init(nodeStorageProvider);

  const [context, newArgs] = context_parse(process.argv);
  if (context) {
    await connection.context_set(context);
    process.argv = newArgs;
  }

  program
    .name("chili")
    .description("Chili Handles Intelligent Line Interactions")
    .option("-v, --verbose", "enable verbose output")
    .option("-c, --config <path>", "path to config file")
    .option("-s, --nosplash", "disable splash screen");

  connectCommand_setup(program);

  // Parse arguments to handle global options
  program.parseOptions(process.argv);
  const options = program.opts();

  if (!options.nosplash) {
    console.log(figlet.textSync("ChILI"));
    console.log("Chili Handles Intelligent Line Interactions");
  }

  // table_display(
  //   ["val1,val2,val3,val4,val5", "val6,val7,val8,val9,val10"],
  //   "col1,col2,col3,col4,col5"
  // );

  // table_display(
  //   [
  //     ["val1", "val2", "val3", "val4", "val5"],
  //     ["val6", "val7", "val8", "val9", "val10"],
  //   ],
  //   "col1,col2,col3,col4,col5"
  // );

  if (options.verbose) {
    console.log("Verbose mode enabled");
  }

  if (options.config) {
    console.log(`Using config file: ${options.config}`);
  }

  // If it's not a connect command, initialize other handlers
  if (!process.argv.includes("connect")) {
    await handlers_initialize();
  }

  // Parse the command
  program.parse(process.argv);
}

main().catch((error) => {
  console.error("An error occurred:", error);
  process.exit(1);
});

// Export utilities for use by other packages (e.g., chell)
export { logical_toPhysical } from './utils/cli.js';