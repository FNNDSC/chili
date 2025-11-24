import { Command } from "commander";
import { BaseGroupHandler } from "../handlers/baseGroupHandler.js";
import { CLIoptions } from "../utils/cli";
import { screen, table_display } from "../screen/screen.js";
import { PluginController } from "../controllers/pluginController.js";
import { Dictionary, errorStack, FilteredResourceData } from "@fnndsc/cumin";
import { plugins_doList } from "../commands/plugins/list.js";
import { plugins_fieldsGet } from "../commands/plugins/fields.js";
import { plugins_search, plugins_doDelete } from "../commands/plugins/delete.js";
import { prompt_confirm } from "../utils/ui.js";
import { plugins_add } from "../commands/plugins/add.js";
import { plugins_doOverview } from "../commands/plugins/overview.js";
import { plugin_doReadme } from "../commands/plugin/readme.js";
import { plugin_doRun } from "../commands/plugin/run.js";
import { plugin_search } from "../commands/plugin/search.js";

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
    await plugins_doOverview();
  }

  /**
   * Removes duplicate column headers from FilteredResourceData results.
   * Copied from BaseGroupHandler to support local listing logic.
   */
  private columns_removeDuplicates(
    results: FilteredResourceData
  ): FilteredResourceData {
    const uniqueHeaders = Array.from(
      new Set(results.selectedFields)
    ) as string[];

    const uniqueTableData = results.tableData.map((row) =>
      uniqueHeaders.reduce<Record<string, any>>((acc, header) => {
        if (typeof header === "string" && header in row) {
          acc[header] = (row as Record<string, any>)[header];
        }
        return acc;
      }, {})
    );

    return {
      ...results,
      selectedFields: uniqueHeaders,
      tableData: uniqueTableData,
    };
  }

  /**
   * Lists plugins using the new command logic.
   */
  async plugins_list(options: CLIoptions): Promise<void> {
    try {
      const results = await plugins_doList(options);

      if (!results) {
        console.error(
          `No ${this.assetName} resources found. Perhaps check your current context?`
        );
        return;
      }

      if (results.tableData.length === 0) {
        console.log(`No ${this.assetName} found matching the criteria.`);
      } else {
        const uniqueResults = this.columns_removeDuplicates(results);
        table_display(
          uniqueResults.tableData,
          uniqueResults.selectedFields,
          { title: { title: this.assetName, justification: "center" } }
        );
      }
    } catch (error) {
      console.log(errorStack.stack_search(this.assetName)[0]);
    }
  }

  /**
   * Lists plugin fields using the new command logic.
   */
  async plugins_fields(): Promise<void> {
    try {
      const fields = await plugins_fieldsGet();
      if (fields && fields.length > 0) {
        table_display(fields, ["fields"]);
      } else {
        console.log(`No resource fields found for ${this.assetName}.`);
      }
    } catch (error) {
      console.log(errorStack.stack_search(this.assetName)[0]);
    }
  }

  /**
   * Deletes plugins using the new command logic.
   */
  async plugins_delete(searchable: string, options: CLIoptions): Promise<void> {
    const searchParts = searchable.split("++").map((part) => part.trim());
    for (const searchPart of searchParts) {
      const items = await plugins_search(searchPart);
      if (items.length === 0) {
        console.log(`No plugins found matching: ${searchPart}`);
        continue;
      }

      for (const item of items) {
        // Show item info - reusing table_display for single item details if possible, or simple log
        console.log(`Preparing to delete Plugin: ID=${item.id}, Name=${item.name}, Version=${item.version}`);

        if (!options.force) {
           const confirmed = await prompt_confirm(`Are you sure you want to delete plugin ${item.name} (ID: ${item.id})?`);
           if (!confirmed) continue;
        }

        const success = await plugins_doDelete(item.id);
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
    await plugins_add(image, options);
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

    pluginsCommand
      .command("list")
      .description(`list ${this.assetName}`)
      .option("-p, --page <size>", "Page size (default 20)")
      .option(
        "-f, --fields <fields>",
        `comma-separated list of ${this.assetName} fields to display`
      )
      .option(
        "-s, --search <searchTerms>",
        `search for ${this.assetName} using comma-separated key-value pairs`
      )
      .action(async (options: CLIoptions) => {
        await this.plugins_list(options);
      });

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

  async plugin_readme(pluginId: string): Promise<void> {
    try {
      console.log(`Fetching readme for plugin with ID: ${pluginId}`);
      const content = await plugin_doReadme(pluginId);
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

  async plugin_run(searchable: string, params: string): Promise<Number | null> {
    try {
      const instance: Dictionary | null = await plugin_doRun(searchable, params);
      if (!instance) {
        console.log(errorStack.messagesOfType_search("error", "plugin"));
        return null;
      }

      table_display(Object.entries(instance), ["Plugin Parameter", "Value"]);
      return instance.id as number;
    } catch (e: any) {
      console.error(e.message);
      return null;
    }
  }

  async plugin_searchableToIDs(searchable: string): Promise<string[] | null> {
    const hits = await plugin_search(searchable);
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
