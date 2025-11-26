/**
 * @file Manages command groups and member operations for ChRIS feeds.
 *
 * This module defines the `FeedGroupHandler` and `FeedMemberHandler` classes,
 * which orchestrate CLI commands for lists of feeds and individual feed operations.
 *
 * @module
 */
import { Command } from "commander";
import { BaseGroupHandler } from "../handlers/baseGroupHandler.js";
import { CLIoptions } from "../utils/cli.js";
import { SimpleRecord, FilteredResourceData, errorStack } from "@fnndsc/cumin";
import { table_display } from "../screen/screen.js";
import { FeedController } from "../controllers/feedController.js";
import chalk from "chalk";
import { feeds_fetchList } from "../commands/feeds/list.js";
import { feedFields_fetch } from "../commands/feeds/fields.js";
import { feed_shareById } from "../commands/feeds/share.js";
import { FeedShareOptions } from "@fnndsc/salsa";
import { feeds_searchByTerm, feed_deleteById } from "../commands/feeds/delete.js";
import { prompt_confirm } from "../utils/ui.js";
import { feed_create } from "../commands/feed/create.js";

/**
 * Handles commands related to groups of ChRIS feeds.
 */
export class FeedGroupHandler {
  private baseGroupHandler: BaseGroupHandler;
  private controller: FeedController;
  assetName = "feeds";

  constructor() {
    this.controller = FeedController.controller_create();
    this.baseGroupHandler = new BaseGroupHandler(
      this.assetName,
      this.controller.chrisObject
    );
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
   * Lists feeds using the new command logic.
   */
  async feeds_list(options: CLIoptions): Promise<void> {
    try {
      const results = await feeds_fetchList(options);

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
   * Lists feed fields using the new command logic.
   */
  async feeds_fields(): Promise<void> {
    try {
      const fields = await feedFields_fetch();
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
   * Shares feeds matching a search term.
   * 
   * @param searchable - The search term to find feeds.
   * @param options - Sharing options (e.g. is_public).
   */
  async feeds_share(searchable: string, options: CLIoptions): Promise<void> {
    const searchParts = searchable.split("++").map((part) => part.trim());
    for (const searchPart of searchParts) {
      const feedIds = await this.baseGroupHandler.IDs_getFromSearch({ search: searchPart });
      if (!feedIds || feedIds.length === 0) {
        console.log(`No feeds found matching: ${searchPart}`);
        continue;
      }

      for (const feedId of feedIds) {
        console.log(`Sharing feed ID: ${feedId}...`);
        const shareOptions: FeedShareOptions = { is_public: options.is_public === true };
        const success = await feed_shareById(feedId, shareOptions);
        if (success) {
          console.log(`Feed ID ${feedId} shared successfully.`);
        } else {
          console.error(`Failed to share feed ID ${feedId}.`);
        }
      }
    }
  }

  /**
   * Deletes feeds using the new command logic.
   * @param searchable - A string resolving to feed IDs.
   * @param options - CLI options, including --force.
   */
  async feeds_delete(searchable: string, options: CLIoptions): Promise<void> {
    const searchParts = searchable.split("++").map((part) => part.trim());
    for (const searchPart of searchParts) {
      const items = await feeds_searchByTerm(searchPart);
      if (items.length === 0) {
        console.log(`No feeds found matching: ${searchPart}`);
        continue;
      }

      for (const item of items) {
        console.log(`Preparing to delete Feed: ID=${item.id}, Name=${item.name}`);

        if (!options.force) {
           const confirmed = await prompt_confirm(`Are you sure you want to delete feed ${item.name} (ID: ${item.id})?`);
           if (!confirmed) continue;
        }

        const success = await feed_deleteById(item.id);
        if (success) {
            console.log(`Deleted feed ${item.id}`);
        } else {
            console.error(`Failed to delete feed ${item.id}`);
        }
      }
    }
  }

  /**
   * Sets up the Commander.js commands for feed group operations.
   *
   * @param program - The Commander.js program instance.
   */
  feedGroupCommand_setup(program: Command): void {
    const feedGroupCommand = program
      .command(this.assetName)
      .description(`Interact with a group of ChRIS ${this.assetName}`);

    feedGroupCommand
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
        await this.feeds_list(options);
      });

    feedGroupCommand
      .command("fieldslist")
      .description(`list the ${this.assetName} resource fields`)
      .action(async () => {
        await this.feeds_fields();
      });

    feedGroupCommand
      .command("delete <searchable>")
      .description(
        `delete target ${this.assetName} resolved from '++' separated <searchable>, i.e. "id:77++id:33"`
      )
      .option(
        "-f, --force",
        `force the deletion without prompting for user confirmation`
      )
      .action(async (searchable: string, options: CLIoptions) => {
        await this.feeds_delete(searchable, options);
      });

    feedGroupCommand
      .command("share <searchable>") // Add searchable argument
      .description("share a (group of) feed(s)")
      .option("-i, --is_public", "Make the feed public or unpublic (default: public)") // is_public as a flag
      .option("-f, --force", "force operation (do not ask for user confirmation)")
      .action(async (searchable: string, options: CLIoptions) => {
        await this.feeds_share(searchable, options);
      });
  }
}

/**
 * Handles commands related to individual ChRIS feeds.
 */
export class FeedMemberHandler {
  private assetName: string;
  private controller: FeedController;

  constructor() {
    this.assetName = "feed";
    this.controller = FeedController.controller_create();
  }

  /**
   * Reports the result of a feed creation operation.
   *
   * @param feedInfo - The SimpleRecord of the created feed, or null if creation failed.
   */
  private feed_reportCreation(feedInfo: SimpleRecord | null): void {
    const headers: string[] = ["Property", "Value"];
    let tableData: any[][];

    if (!feedInfo) {
      tableData = [["Status", chalk.red("A feed creation error occurred.")]];
    } else {
      tableData = [
        ["Status", chalk.cyan("Success")],
        ["Plugin ID", feedInfo.pluginInstance.data.id],
        ["Feed ID", feedInfo.id],
        ["Feed Name", feedInfo.name],
        ["Owner", feedInfo.owner_username],
      ];
    }
    table_display(tableData, headers);
  }

  /**
   * Creates a new ChRIS feed based on CLI options.
   *
   * @param options - CLI options for feed creation.
   * @returns A Promise resolving to the SimpleRecord of the created feed, or null on failure.
   */
  async feed_create(options: CLIoptions): Promise<SimpleRecord | null> {
    let feedInfo: SimpleRecord | null;

    try {
      feedInfo = await feed_create(options);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(message); // Log the specific error message
      feedInfo = null;
    }

    this.feed_reportCreation(feedInfo);

    return feedInfo;
  }

  /**
   * Sets up the Commander.js commands for individual feed operations.
   *
   * @param program - The Commander.js program instance.
   */
  feedCommand_setup(program: Command): void {
    const feedCommand = program
      .command(this.assetName)
      .description(`Interact with a single ChRIS ${this.assetName}`);

    if (feedCommand) {
      feedCommand
        .command("create")
        .description("Create a new feed")
        .option(
          "-p, --params <FeedParams>",
          "comma separated list of feed parameters ('title', 'cpu_limit', etc.)"
        )
        .option(
          "-d, --dirs <ChRISpath>",
          "a (comma separated) path inside the ChRIS FS containing data for the root node"
        )
        .action(async (options: CLIoptions) => {
          await this.feed_create(options);
        });
    } else {
      console.error(
        `Failed to find '${this.assetName}' command. The 'new' subcommand was not added.`
      );
    }
  }
}
