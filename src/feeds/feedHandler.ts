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
import { errorStack } from "@fnndsc/cumin"; // Import errorStack
import { table_display } from "../screen/screen.js";
import { FeedController } from "../controllers/feedController.js";
import chalk from "chalk";
import { feedFields_fetch } from "../commands/feeds/fields.js";
import { feed_shareById } from "../commands/feeds/share.js";
import { FeedShareOptions } from "@fnndsc/salsa";
import { feeds_searchByTerm, feed_deleteById } from "../commands/feeds/delete.js";
import { prompt_confirm } from "../utils/ui.js";
import { feed_create as feed_create_command } from "../commands/feed/create.js"; // Original name
import { feedCreate_render } from "../views/feed.js"; // Still needed for feedCreate_render
import { Feed } from "../models/feed.js";
// import { FeedListResult } from "../commands/feeds/list.js"; // No longer needed

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

  // /**
  //  * Lists feeds using the new command logic.
  //  */
  // async feeds_list(options: CLIoptions): Promise<void> {
  //   try {
  //     const { feeds, selectedFields }: FeedListResult = await feeds_fetchList(options);
  //     console.log(feedList_render(feeds, selectedFields, { table: options.table, csv: options.csv }));
  //   } catch (error: unknown) {
  //     const msg = error instanceof Error ? error.message : String(error);
  //     console.error(chalk.red(`Error listing feeds: ${msg}`));
  //   }
  // }

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
        const success = await feed_shareById(Number(feedId), shareOptions);
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

    // Use base list command generator
    const listCommand = this.baseGroupHandler.baseListCommand_create(
      async (options: CLIoptions) => {
        // Use the base generic renderer instead of the custom one
        await this.baseGroupHandler.resources_list(options);
      }
    );
    feedGroupCommand.addCommand(listCommand);

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
      .command("share <searchable>") 
      .description("share a (group of) feed(s)")
      .option("-i, --is_public", "Make the feed public or unpublic (default: public)") 
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
   * Creates a new ChRIS feed based on CLI options.
   *
   * @param options - CLI options for feed creation.
   * @returns A Promise resolving to the created Feed object, or null on failure.
   */
  async feed_create(options: CLIoptions): Promise<Feed | null> {
    try {
      const feed = await feed_create_command(options);
      if (feed) {
        console.log(feedCreate_render(feed));
        return feed;
      }
      console.error(chalk.red("Feed creation returned null result."));
      const errors = errorStack.allOfType_get('error'); // Keep error reporting
      if (errors.length > 0) {
          console.error(chalk.red('Errors:'));
          errors.forEach(e => console.error(chalk.red(`  - ${e}`)));
      }
      return null;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`Error: ${message}`));
      return null;
    }
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