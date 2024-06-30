import { Command } from "commander";
import { chrisFeed, ListFeedsOptions, FeedItem } from "@fnndsc/cumin";

// interface ListFeedsOptions {
//   page?: string;
//   fields?: string;
//   [key: string]: any;
// }
//
// interface FeedItem {
//   data: Array<{ name: string; value: any }>;
//   href: string;
//   links: Array<any>;
// }
//
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function listFeeds(options: ListFeedsOptions): Promise<void> {
  await sleep(100);
}

async function createFeed(options: ListFeedsOptions): Promise<void> {
  await sleep(100);
}

export function setupFeedCommand(program: Command): void {
  const feedCommand = program
    .command("feed")
    .description("Interact with ChRIS feeds");

  feedCommand
    .command("list")
    .description("List feeds")
    .option("-p, --page <size>", "Page size (default 20)")
    .option(
      "-f, --fields <fields>",
      "Comma-separated list of fields to display",
    )
    .action(async (options) => {
      await listFeeds(options);
    });

  feedCommand
    .command("new")
    .description("Create a new feed")
    .option("-n, --name <FeedName>", "the name for the feed")
    .option("-p, --path <ChRISpath>", "a path inside the ChRIS FS")
    .action(async (options) => {
      await createFeed(options);
    });
}
