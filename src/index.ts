#!/usr/bin/env node

import { Command } from "commander";
import figlet from "figlet";
import omelette from "omelette";

import { setupConnectCommand } from "./connect/connectHandler.js";
import { FeedGroupHandler, FeedMemberHandler } from "./feeds/feedHandler.js";
import {
  PluginGroupHandler,
  PluginMemberHandler,
} from "./plugins/pluginHandler.js";
import { PluginMetaGroupHandler } from "./plugins/pluginMetaHandler.js";
import { PluginContextGroupHandler } from "./plugins/pluginGroupHandler.js";
import { setupInodeCommand } from "./filesystem/inodeCommand.js";
import { setupContextCommand } from "./context/contextCommand.js";
import { setupPathCommand } from "./path/pathCommand.js";
import { setupFileBrowserCommand } from "./filesystem/filesystemHandler.js";
import { setupManCommand } from "./man/man.js";
import { chrisConnection } from "@fnndsc/cumin";
import { FileGroupHandler } from "./filesystem/fileGroupHandler.js";
import { screen, displayTable } from "./screen/screen.js";

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
  setupPathCommand(program);
  setupManCommand(program);
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

  const pluginMemberHandler: PluginMemberHandler = new PluginMemberHandler();
  pluginMemberHandler.setupCommand(program);

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

  const computesOfPluginHandler: PluginContextGroupHandler =
    await PluginContextGroupHandler.create("computesofplugin");
  computesOfPluginHandler.setupCommand(program);

  const pluginInstancesHandler: PluginContextGroupHandler =
    await PluginContextGroupHandler.create("plugininstances");
  pluginInstancesHandler.setupCommand(program);

  const pluginParametersHandler: PluginContextGroupHandler =
    await PluginContextGroupHandler.create("pluginparameters");
  pluginParametersHandler.setupCommand(program);

  setupCommandCompletion();
}

function parseContext(args: string[]): [string | undefined, string[]] {
  if (args.length > 2 && args[2].includes("=")) {
    const context: string = args[2];
    return [context, [args[0], args[1], ...args.slice(3)]];
  }
  return [undefined, args];
}

async function main() {
  const [context, newArgs] = parseContext(process.argv);
  if (context) {
    chrisConnection.setContext(context);
    process.argv = newArgs;
  }

  program
    .name("chili")
    .description("The ChRIS Interactive Line Interface")
    .option("-v, --verbose", "enable verbose output")
    .option("-c, --config <path>", "path to config file")
    .option("-s, --nosplash", "disable splash screen");

  setupConnectCommand(program);

  // Parse arguments to handle global options
  program.parseOptions(process.argv);
  const options = program.opts();

  if (!options.nosplash) {
    console.log(figlet.textSync("ChILI"));
    console.log("The ChRIS Interactive Line Interface");
  }

  // displayTable(
  //   ["val1,val2,val3,val4,val5", "val6,val7,val8,val9,val10"],
  //   "col1,col2,col3,col4,col5"
  // );

  // displayTable(
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
    await initializeHandlers();
  }

  // Parse the command
  program.parse(process.argv);
}

main().catch((error) => {
  console.error("An error occurred:", error);
  process.exit(1);
});
