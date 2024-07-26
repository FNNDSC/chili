import { Command } from "commander";
import { BaseHandler } from '../handlers/baseHandler.js';
import { ChRISFeed } from "@fnndsc/cumin";
import { CLIoptions } from '../utils/cli';

export class FeedHandler  {
  private baseHandler: BaseHandler;
  assetName = "feeds";

  constructor() {
    const chrisFeed = new ChRISFeed();
    this.baseHandler = new BaseHandler(this.assetName, chrisFeed);
  }

  async createFeed(options: CLIoptions): Promise<void> {
    try {
      console.log("Creating new feed...");
      // Implement actual feed creation logic here
      // For example:
      // const newFeed = await this.asset.create({
      //   name: options.name,
      //   path: options.path,
      // });
      // console.log(`New feed created with ID: ${newFeed.id}`);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(`Error creating feed: ${error.message}`);
      } else {
        console.error('An unknown error occurred while creating the feed');
      }
    }
  }

  setupCommand(program: Command): void {
    this.baseHandler.setupCommand(program);

    const feedCommand = program.commands.find(cmd => cmd.name() === this.assetName);
    
    if (feedCommand) {
      feedCommand
        .command("new")
        .description("Create a new feed")
        .option("-n, --name <FeedName>", "the name for the feed")
        .option("-p, --path <ChRISpath>", "a path inside the ChRIS FS")
        .action(async (options: CLIoptions) => {
          await this.createFeed(options);
        });
    } else {
      console.error(`Failed to find '${this.assetName}' command. The 'new' subcommand was not added.`);
    }
  }
}

