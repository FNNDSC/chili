#!/usr/bin/env node

/**
 * Suppress DEP0169 warning from axios/proxy-from-env dependency.
 *
 * This warning originates from the `proxy-from-env` package (version 1.1.0)
 * used by axios for proxy configuration. The package uses the legacy `url.parse()`
 * API which is deprecated in favor of the WHATWG URL API.
 *
 * Why we suppress it:
 * - It's a transitive dependency (axios → proxy-from-env) we don't control
 * - proxy-from-env 1.1.0 is the latest version and hasn't been updated
 * - According to the warning: "CVEs are not issued for url.parse() vulnerabilities"
 * - The warning doesn't affect functionality, only console output
 * - This is a well-known issue in the Node.js ecosystem
 *
 * This can be removed once:
 * - proxy-from-env migrates to WHATWG URL API, OR
 * - axios replaces proxy-from-env with an alternative
 *
 * Tracking: https://github.com/Rob--W/proxy-from-env/issues/51
 */
const originalEmitWarning = process.emitWarning;
process.emitWarning = function (warning: string | Error, ...args: any[]): void {
  // Suppress only the specific DEP0169 warning
  if (
    typeof warning === 'string' &&
    (warning.includes('DEP0169') || warning.includes('url.parse()'))
  ) {
    return;
  }
  // Allow all other warnings through
  return originalEmitWarning.call(process, warning, ...args);
};

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
  // Find the first argument that looks like a context string (contains "=" but doesn't start with "-")
  for (let i = 2; i < args.length; i++) {
    const arg = args[i];
    if (arg.includes("=") && !arg.startsWith("-")) {
      const context: string = arg;
      // Reconstruct args without the context string
      const newArgs = [...args.slice(0, i), ...args.slice(i + 1)];
      return [context, newArgs];
    }
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
    const contextSetSuccess = await connection.context_set(context);
    if (!contextSetSuccess) {
      console.error("Failed to set context. Exiting.");
      process.exit(1);
    }
    process.argv = newArgs;
  }

  program
    .name("chili")
    .description("ChILI handles Intelligent Line Interactions")
    .option("-v, --verbose", "enable verbose output")
    .option("-c, --config <path>", "path to config file")
    .option("-s, --nosplash", "disable splash screen");

  connectCommand_setup(program);
  await handlers_initialize(); // Call handlers_initialize here
  
  // Parse arguments to handle global options
  program.parseOptions(process.argv);
  const options = program.opts();

  if (!options.nosplash) {
    console.log(figlet.textSync("ChILI"));
    console.log("ChILI handles Intelligent Line Interactions");
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