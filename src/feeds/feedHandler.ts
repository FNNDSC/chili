import { Command } from "commander";
import { BaseGroupHandler } from "../handlers/baseGroupHandler.js";
import {
  ChRISFeedGroup,
  ChRISFeed,
  ChRISPluginGroup,
  FilteredResourceData,
  ListOptions,
} from "@fnndsc/cumin";
import { CLIoptions } from "../utils/cli.js";
import {
  chrisConnection,
  Client,
  applyKeyPairParams,
  optionsToParams,
  SimpleRecord,
} from "@fnndsc/cumin";
import { PluginInstance } from "@fnndsc/chrisapi";

export class FeedGroupHandler {
  private baseGroupHandler: BaseGroupHandler;
  assetName = "feeds";

  constructor() {
    const chrisFeedGroup = new ChRISFeedGroup();
    this.baseGroupHandler = new BaseGroupHandler(
      this.assetName,
      chrisFeedGroup
    );
  }

  async shareFeeds(options: CLIoptions): Promise<void> {
    try {
      console.log("Share feeds...");
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(`Error sharing feed(s): ${error.message}`);
      } else {
        console.error("An unknown error occurred while deleting the feed(s)");
      }
    }
  }

  setupCommand(program: Command): void {
    this.baseGroupHandler.setupCommand(program);

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
          await this.shareFeeds(options);
        });
    } else {
      console.error(
        `Failed to find '${this.assetName}' command. The 'share' subcommand was not added.`
      );
    }
  }
}

export class FeedMemberHandler {
  private assetName: string;

  constructor() {
    this.assetName = "feed";
  }

  async createFeed(options: CLIoptions): Promise<SimpleRecord | null> {
    const chrisFeed: ChRISFeed = new ChRISFeed();
    const feedInfo: SimpleRecord = await chrisFeed.createFromDirs(
      options.dirs,
      optionsToParams({ ...options, returnFilter: "params" })
    );
    if (!feedInfo) {
      console.error("A feed creation error occurred.");
      return null;
    }
    console.log(
      `Feed ${feedInfo.id} with name "${feedInfo.name}" and owned by "${feedInfo.owner_username}" successfully created.`
    );
    return feedInfo;
  }

  setupCommand(program: Command): void {
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
          await this.createFeed(options);
        });
    } else {
      console.error(
        `Failed to find '${this.assetName}' command. The 'new' subcommand was not added.`
      );
    }
  }
}
