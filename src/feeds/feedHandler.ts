import { Command } from "commander";
import { BaseGroupHandler } from "../handlers/baseGroupHandler.js";
import { CLIoptions } from "../utils/cli.js";
import { SimpleRecord } from "@fnndsc/cumin";
import { table_display } from "../screen/screen.js";
import { FeedController } from "../controllers/feedController.js";
import chalk from "chalk";

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
   * Handles sharing of ChRIS feeds.
   *
   * @param options - CLI options for sharing feeds.
   */
  async feeds_share(options: CLIoptions): Promise<void> {
    try {
      console.log("Share feeds...");
      await this.controller.feeds_share(options);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(`Error sharing feed(s): ${error.message}`);
      } else {
        console.error("An unknown error occurred while deleting the feed(s)");
      }
    }
  }

  /**
   * Sets up the Commander.js commands for feed group operations.
   *
   * @param program - The Commander.js program instance.
   */
  feedGroupCommand_setup(program: Command): void {
    this.baseGroupHandler.command_setup(program);

    const feedGroupCommand = program.commands.find(
      (cmd) => cmd.name() === this.assetName
    );

    if (feedGroupCommand) {
      feedGroupCommand
        .command("share")
        .description("share a (group of) feed(s)")
        .option(
          "-f, --force",
          "force deletion (do not ask for user confirmation)"
        )
        .action(async (options: CLIoptions) => {
          await this.feeds_share(options);
        });
    } else {
      console.error(
        `Failed to find '${this.assetName}' command. The 'share' subcommand was not added.`
      );
    }
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
      feedInfo = await this.controller.feed_create(options);
    } catch (error) {
      console.error("An error occurred during feed creation:", error);
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
