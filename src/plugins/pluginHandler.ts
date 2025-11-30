/**
 * @file Manages command groups and member operations for ChRIS plugins.
 *
 * This module defines the `PluginGroupHandler` and `PluginMemberHandler` classes,
 * which orchestrate CLI commands for lists of plugins and individual plugin operations.
 *
 * @module
 */
import { Command } from "commander";
import { BaseGroupHandler } from "../handlers/baseGroupHandler.js";
import { CLIoptions } from "../utils/cli.js";
import { table_display } from "../screen/screen.js";
import { PluginController } from "../controllers/pluginController.js";
import { errorStack, FilteredResourceData, Searchable } from "@fnndsc/cumin";
import { plugins_fetchList, PluginListResult } from "../commands/plugins/list.js";
import { pluginFields_fetch } from "../commands/plugins/fields.js";
import { plugins_searchByTerm, plugin_deleteById } from "../commands/plugins/delete.js";
import { prompt_confirm } from "../utils/ui.js";
import { plugin_add } from "../commands/plugins/add.js";
import { pluginsOverview_display } from "../commands/plugins/overview.js";
import { pluginReadme_fetch } from "../commands/plugin/readme.js";
import { plugin_execute } from "../commands/plugin/run.js";
import { pluginIds_resolve } from "../commands/plugin/search.js";
import { pluginList_render, pluginRun_render } from "../views/plugin.js";
import { Plugin, PluginInstance } from "../models/plugin.js";

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

  /**
   * Displays an overview of the plugin system.
   */
  async plugins_overview(): Promise<void> {
    await pluginsOverview_display();
  }

  /**
   * Lists plugins using the new command logic.
   */
  async plugins_list(options: CLIoptions): Promise<void> {
    try {
      const { plugins, selectedFields } = await plugins_fetchList(options);
      console.log(pluginList_render(plugins, selectedFields, { table: options.table, csv: options.csv }));
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(msg);
    }
  }

  /**
   * Lists plugin fields using the new command logic.
   */
  async plugins_fields(): Promise<void> {
    try {
      const fields = await pluginFields_fetch();
      if (fields && fields.length > 0) {
        table_display(fields, ["fields"]);
      } else {
        console.log(`No resource fields found for ${this.assetName}.`);
      }
    } catch (error: unknown) {
      console.log(errorStack.stack_search(this.assetName)[0]);
    }
  }

  /**
   * Deletes plugins using the new command logic.
   * Supports batch deletion using ++ separator.
   */
  async plugins_delete(searchable: string, options: CLIoptions): Promise<void> {
    const searchableObj = Searchable.from(searchable);
    const searchables = searchableObj.toBatchSearchables();

    for (const search of searchables) {
      const items = await plugins_searchByTerm(search.raw);
      if (items.length === 0) {
        console.log(`No plugins found matching: ${search.raw}`);
        continue;
      }

      for (const item of items) {
        // Show item info - reusing table_display for single item details if possible, or simple log
        console.log(`Preparing to delete Plugin: ID=${item.id}, Name=${item.name}, Version=${item.version}`);

        if (!options.force) {
           const confirmed = await prompt_confirm(`Are you sure you want to delete plugin ${item.name} (ID: ${item.id})?`);
           if (!confirmed) continue;
        }

        const success = await plugin_deleteById(item.id);
        if (success) {
            console.log(`Deleted plugin ${item.id}`);
        } else {
            console.error(`Failed to delete plugin ${item.id}`);
        }
      }
    }
  }

  /**
   * Adds a new plugin to ChRIS.
   * @param image - The Docker image of the plugin.
   * @param options - CLI options including public_repo and compute environments.
   */
  async plugins_add(image: string, options: CLIoptions): Promise<void> {
    await plugin_add(image, options);
  }

  /**
   * Sets up the Commander.js commands for plugin group operations.
   *
   * @param program - The Commander.js program instance.
   */
  pluginGroupCommand_setup(program: Command): void {
    // Manually set up commands to use new logic for list, but keep base for others
    const pluginsCommand = program
      .command(this.assetName)
      .description(`Interact with a group of ChRIS ${this.assetName}`);

    // Use base list command generator and add plugin-specific options
    const listCommand = this.baseGroupHandler.baseListCommand_create(
      async (options: CLIoptions) => {
        await this.plugins_list(options);
      }
    );
    listCommand.option("-a, --all", "List all plugins (disable pagination)");
    pluginsCommand.addCommand(listCommand);

    pluginsCommand
      .command("fieldslist")
      .description(`list the ${this.assetName} resource fields`)
      .action(async () => {
        await this.plugins_fields();
      });

    pluginsCommand
      .command("delete <searchable>")
      .description(
        `delete target ${this.assetName} resolved from '++' separated <searchable>, i.e. "id:77++id:33"`
      )
      .option(
        "-f, --force",
        `force the deletion without prompting for user confirmation`
      )
      .action(async (searchable: string, options: CLIoptions) => {
        await this.plugins_delete(searchable, options);
      });

    pluginsCommand
        .command("overview")
        .description("Get an overview of various plugin-group operations")
        .action(async (pluginId: string, options: CLIoptions) => {
          await this.plugins_overview();
        });

    pluginsCommand
        .command("add <image>")
        .description("Add a new plugin to ChRIS from a Docker image")
        .option(
          "-r, --public_repo <url>",
          "Public repository URL of the plugin (e.g., https://github.com/FNNDSC/pl-dcm2niix)"
        )
        .option(
          "-c, --compute <names>",
          "Comma-separated list of compute resource names to assign the plugin to"
        )
        .action(async (image: string, options: CLIoptions) => {
          await this.plugins_add(image, options);
        });
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

  /**
   * Fetches and displays the README of a specific plugin.
   */
  async plugin_readme(pluginId: string): Promise<void> {
    try {
      console.log(`Fetching readme for plugin with ID: ${pluginId}`);
      const content = await pluginReadme_fetch(pluginId);
      if (content) {
        console.log(content);
      } else {
        console.error("Could not fetch README for this plugin.");
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(`Error fetching plugin info: ${error.message}`);
      } else {
        console.error("An unknown error occurred while fetching plugin info");
      }
    }
  }

  /**
   * Runs a plugin instance.
   */
  async plugin_run(searchable: string, params: string): Promise<number | null> {
    try {
      const instance: PluginInstance | null = await plugin_execute(searchable, params);
      if (!instance) {
        console.log(errorStack.messagesOfType_search("error", "plugin"));
        return null;
      }

      console.log(pluginRun_render(instance));
      return instance.id;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      console.error(message);
      return null;
    }
  }

  /**
   * Resolves a search term to plugin IDs.
   */
  async plugin_searchableToIDs(searchable: string): Promise<string[] | null> {
    const hits = await pluginIds_resolve(searchable);
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
          await this.plugin_readme(pluginId);
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