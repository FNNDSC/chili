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
} from "@fnndsc/cumin";
import { PluginInstance } from "@fnndsc/chrisapi";

export class FeedGroupHandler {
  private baseHandler: BaseGroupHandler;
  assetName = "feeds";

  constructor() {
    const chrisFeedGroup = new ChRISFeedGroup();
    this.baseHandler = new BaseGroupHandler(this.assetName, chrisFeedGroup);
  }

  async deleteFeeds(options: CLIoptions): Promise<void> {
    try {
      console.log("Delete feeds...");
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(`Error deleting feed(s): ${error.message}`);
      } else {
        console.error("An unknown error occurred while deleting the feed(s)");
      }
    }
  }

  setupCommand(program: Command): void {
    this.baseHandler.setupCommand(program);

    const feedGroupCommand = program.commands.find(
      (cmd) => cmd.name() === this.assetName
    );

    if (feedGroupCommand) {
      feedGroupCommand
        .command("delete")
        .description("delete a (group of) feed(s)")
        .option(
          "-f, --force",
          "force deletion (do not ask for user confirmation)"
        )
        .action(async (options: CLIoptions) => {
          await this.deleteFeeds(options);
        });
    } else {
      console.error(
        `Failed to find '${this.assetName}' command. The 'tag' subcommand was not added.`
      );
    }
  }
}

export class FeedMemberHandler {
  private assetName: string;

  constructor() {
    this.assetName = "feed";
  }

  async pl_dircopy_getID(): Promise<number | null> {
    const chrisPluginGroup = new ChRISPluginGroup();
    const searchCLI: CLIoptions = { search: "name_exact: pl-dircopy" };
    const searchParams: ListOptions = optionsToParams(searchCLI);
    const searchResults: FilteredResourceData | null =
      await chrisPluginGroup.asset.resources_listAndFilterByOptions(
        searchParams
      );
    if (!searchResults) {
      return null;
    }
    return searchResults.tableData[0].id;
  }

  async createFeed(options: CLIoptions): Promise<number> {
    const chrisFeed: ChRISFeed = new ChRISFeed();
    const feedID: number = await chrisFeed.createFromDirs(
      options.dirs,
      optionsToParams({ ...options, returnFilter: options.params })
    );
    return feedID;

    // try {
    //   console.log("Creating new feed...");
    //   const pluginID: number | null = await this.pl_dircopy_getID();
    //   if (pluginID === null) {
    //     console.error(
    //       "pl-dircopy plugin was not found! No feeds can be created."
    //     );
    //     return;
    //   }

    //   const client: Client = chrisConnection.getClient();
    //   console.log(options);
    //   const createParams: Record<string, string> = applyKeyPairParams(
    //     { dir: options.dir },
    //     options.params
    //   );
    //   console.log(createParams);
    //   const pluginInstance: PluginInstance = await client.createPluginInstance(
    //     pluginID,
    //     createParams
    //   );
    //   console.log(pluginInstance);
    // } catch (error: unknown) {
    //   if (error instanceof Error) {
    //     console.error(`Error creating feed: ${error.message}`);
    //   } else {
    //     console.error("An unknown error occurred while creating the feed");
    //   }
    // }
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
          "-d, --dir <ChRISpath>",
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
