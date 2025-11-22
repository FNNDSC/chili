import { Command } from "commander";
import { BaseGroupHandler } from "../handlers/baseGroupHandler.js";
import { CLIoptions } from "../utils/cli";
import { screen, table_display } from "../screen/screen.js";
import { PluginController } from "../controllers/pluginController.js";
import { Dictionary, errorStack } from "@fnndsc/cumin";

/**
 * Handles commands related to groups of ChRIS plugins.
 */
export class PluginGroupHandler {
  private baseGroupHandler: BaseGroupHandler;
  private controller: PluginController;
  assetName = "plugins";

  constructor() {
    this.controller = PluginController.controller_create();
    this.baseGroupHandler = new BaseGroupHandler(
      this.assetName,
      this.controller.chrisObject
    );
  }

  async plugins_overview(): Promise<void> {
    await this.controller.plugins_overview();
  }

  /**
   * Sets up the Commander.js commands for plugin group operations.
   *
   * @param program - The Commander.js program instance.
   */
  pluginGroupCommand_setup(program: Command): void {
    this.baseGroupHandler.command_setup(program);

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

/**
 * Handles commands related to individual ChRIS plugins.
 */
export class PluginMemberHandler {
  private assetName: string;
  private controller: PluginController;

  constructor() {
    this.assetName = "plugin";
    this.controller = PluginController.controller_create();
  }

  async plugin_infoGet(pluginId: string): Promise<void> {
    try {
      console.log(`Fetching info for plugin with ID: ${pluginId}`);
      await this.controller.plugin_infoGet(pluginId);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(`Error fetching plugin info: ${error.message}`);
      } else {
        console.error("An unknown error occurred while fetching plugin info");
      }
    }
  }

  async plugin_run(searchable: string, params: string): Promise<Number | null> {
    const instance: Dictionary | null = await this.controller.plugin_run(
      searchable,
      params
    );
    if (!instance) {
      console.log(errorStack.messagesOfType_search("error", "plugin"));
      return null;
    }

    table_display(Object.entries(instance), ["Plugin Parameter", "Value"]);
    return instance.id as number;
  }

  async plugin_searchableToIDs(searchable: string): Promise<string[] | null> {
    const hits = await this.controller.plugin_searchableToIDs(searchable);
    if (!hits) {
      return null;
    }
    console.log(hits);
    return hits;
  }

  /**
   * Sets up the Commander.js commands for individual plugin operations.
   *
   * @param program - The Commander.js program instance.
   */
  pluginCommand_setup(program: Command): void {
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
