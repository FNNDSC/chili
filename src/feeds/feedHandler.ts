import { Command } from "commander";
import { ChRISFeed, ChRISFeed_create, ListOptions, FilteredResourceData } from "@fnndsc/cumin";

interface FeedCLIoptions {
  page?: string;
  fields?: string;
  [key: string]: any;
}

function optionsToParams(pluginOptions: FeedCLIoptions): ListOptions {
  return {
    limit: pluginOptions.page ? parseInt(pluginOptions.page, 10) : 20,
    offset: 0,
    name: undefined,
    fields: pluginOptions.fields,
  };
}

async function listFeeds(options: FeedCLIoptions): Promise<void> {
  const chrisFeed = new ChRISFeed();
  const params: ListOptions = optionsToParams(options);
  const results: FilteredResourceData =
    await chrisFeed.asset.resources_filterByFields(
      await chrisFeed.asset.resourceFields_get(
        await chrisFeed.asset.resources_getList(params),
      ),
    );
  console.table(results.tableData, results.selectedFields);
}

async function listFeedFields(): Promise<void> {
  const chrisFeed = new ChRISFeed();
  console.log("listing properties of feeds...");
  const results = await chrisFeed.asset.resourceFields_get();
  console.table(results.fields);
}

async function createFeed(options: FeedCLIoptions): Promise<void> {
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  await sleep(100);
}

export function setupFeedCommand(program: Command): void {
  const feedCommand = program
    .command("feeds")
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

  feedCommand
    .command("fieldslist")
    .description("List the feed resource fields")
    .action(async () => {
      await listFeedFields();
    });
}
