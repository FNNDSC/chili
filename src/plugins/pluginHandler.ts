import { Command } from "commander";
import { BaseGroupHandler } from "../handlers/baseGroupHandler.js";
import {
  ChRISPluginGroup,
  ChRISPlugin,
  QueryHits,
  errorStack,
  Dictionary,
} from "@fnndsc/cumin";
import { CLIoptions } from "../utils/cli";
import { screen } from "../screen/screen.js";

export class PluginGroupHandler {
  private baseGroupHandler: BaseGroupHandler;
  assetName = "plugins";

  constructor() {
    const chrisPluginGroup = new ChRISPluginGroup();
    this.baseGroupHandler = new BaseGroupHandler(
      this.assetName,
      chrisPluginGroup
    );
  }

  async plugins_overview(): Promise<void> {
    return;
  }

  setupCommand(program: Command): void {
    this.baseGroupHandler.setupCommand(program);

    const pluginsCommand = program.commands.find(
      (cmd) => cmd.name() === this.assetName
    );

    if (pluginsCommand) {
      pluginsCommand
        .command("overview")
        .description("Get an overview of various plugin-group operations")
        .action(async (pluginId: string, options: CLIoptions) => {
          await this.plugins_overview();
        });
    } else {
      console.error(`Failed to find '${this.assetName}' command.`);
    }
  }
}

export class PluginMemberHandler {
  private assetName: string;

  constructor() {
    this.assetName = "plugin";
  }

  async plugin_infoGet(pluginId: string): Promise<void> {
    try {
      // This is a placeholder. Replace with actual implementation using cumin
      console.log(`Fetching info for plugin with ID: ${pluginId}`);
      // const pluginInfo = await this.asset.getPluginInfo(pluginId);
      // console.log(JSON.stringify(pluginInfo, null, 2));
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(`Error fetching plugin info: ${error.message}`);
      } else {
        console.error("An unknown error occurred while fetching plugin info");
      }
    }
  }

  async plugin_run(searchable: string, params: string): Promise<Number | null> {
    const chrisPlugin: ChRISPlugin = new ChRISPlugin();
    const instance: Dictionary | null = await chrisPlugin.plugin_run(
      searchable,
      params
    );
    if (!instance) {
      console.log(errorStack.searchMessagesOfType("error", "plugin"));
    }
    screen.table(instance, {
      head: ["Plugin Parameter", "Value"],
    });
    return instance.id;
  }

  async plugin_searchableToIDs(searchable: string): Promise<string[] | null> {
    const chrisPlugin: ChRISPlugin = new ChRISPlugin();
    const queryHits: QueryHits | null = await chrisPlugin.pluginIDs_resolve(
      searchable
    );
    if (!queryHits) {
      return null;
    }
    console.log(queryHits.hits);
    return queryHits.hits;
  }

  setupCommand(program: Command): void {
    const pluginCommand = program
      .command(this.assetName)
      .description(`Interact with a single ChRIS ${this.assetName}`);

    if (pluginCommand) {
      pluginCommand
        .command("readme <pluginId>")
        .description("Get the readme of a specific plugin")
        .action(async (pluginId: string, options: CLIoptions) => {
          await this.plugin_infoGet(pluginId);
        });

      pluginCommand
        .command("run <searchable...>")
        .description("Run a plugin in a given context")
        .allowUnknownOption(true)
        .action(async (args: string[], command: Command) => {
          const searchable: string = args[0];
          let pluginParams: string = "";
          if (args.length > 0) {
            pluginParams = args.slice(1).join("' '");
          }
          pluginParams = `'${pluginParams}'`;
          await this.plugin_run(searchable, pluginParams);
        });

      pluginCommand
        .command("search <searchable>")
        .description("Resolve a plugin searchable into an ID")
        .action((searchable) => {
          this.plugin_searchableToIDs(searchable);
        });
    } else {
      console.error(
        `Failed to find '${this.assetName}' command. The 'readme' subcommand was not added.`
      );
    }
  }
}
