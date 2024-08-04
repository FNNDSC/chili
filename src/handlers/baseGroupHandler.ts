import { Command } from "commander";
import {
  FilteredResourceData,
  ChRISPluginGroup,
  ChRISFeedGroup,
  ListOptions,
  QueryHits,
  extractRecordToQueryHits,
} from "@fnndsc/cumin";
import { CLIoptions, optionsToParams } from "../utils/cli.js";

export class BaseGroupHandler {
  assetName: string = "";
  chrisObject: ChRISPluginGroup | ChRISFeedGroup;

  constructor(
    assetName: string,
    chrisObject: ChRISPluginGroup | ChRISFeedGroup
  ) {
    this.assetName = assetName;
    this.chrisObject = chrisObject;
  }

  async listResources(options: CLIoptions): Promise<void> {
    try {
      const params = optionsToParams(options);
      const results: FilteredResourceData | null =
        await this.chrisObject.asset.resources_listAndFilterByOptions(params);

      if (!results) {
        console.error(`No ${this.assetName} resources found.`);
        return;
      }

      if (results.tableData.length === 0) {
        console.log(`No ${this.assetName} found matching the criteria.`);
      } else {
        console.table(results.tableData, results.selectedFields);
      }
    } catch (error) {
      console.error(
        `An error occurred while listing ${this.assetName}:`,
        error
      );
    }
  }

  async listResourceFields(): Promise<void> {
    try {
      const results = await this.chrisObject.asset.resourceFields_get();

      if (!results) {
        console.error(
          `An error occurred while fetching resource fields for ${this.assetName}.`
        );
        return;
      }

      if (results.fields.length === 0) {
        console.log(`No resource fields found for ${this.assetName}.`);
      } else {
        console.table(results.fields);
      }
    } catch (error) {
      console.error(
        `An error occurred while listing ${this.assetName} resource fields:`,
        error
      );
    }
  }

  async deleteResources(): Promise<boolean> {
    let status: boolean = true;
    return true;
  }

  async IDs_getFromSearch(options: CLIoptions): Promise<string[] | null> {
    const params: ListOptions = optionsToParams(options);
    const searchResults: FilteredResourceData | null =
      this.chrisObject.asset.resources_listAndFilterByOptions(params);
    if (!searchResults) {
      return null;
    }
    const queryHits: QueryHits = extractRecordToQueryHits(
      searchResults.table,
      "id"
    );
    return queryHits;
  }

  setupCommand(program: Command): void {
    const command = program
      .command(this.assetName)
      .description(`Interact with a group of ChRIS ${this.assetName}`);

    command
      .command("list")
      .description(`List ${this.assetName}`)
      .option("-p, --page <size>", "Page size (default 20)")
      .option(
        "-f, --fields <fields>",
        "Comma-separated list of fields to display"
      )
      .option(
        "-s, --search <searchTerms>",
        "Search terms in key:value format, separated by commas"
      )
      .action(async (options) => {
        await this.listResources(options);
      });

    command
      .command("fieldslist")
      .description(`List the ${this.assetName} resource fields`)
      .action(async () => {
        await this.listResourceFields();
      });

    command
      .command("delete [ID]")
      .description(
        `Delete target ${this.assetName} -- either by direct ID (comma separated list) or specified in a --search`
      )
      .action(
        async (
          ID: string | undefined,
          IDs: string[] | null,
          options: CLIoptions & { search?: string }
        ) => {
          let targetID: string | null;
          if (ID === undefined) {
            IDs = await this.IDs_getFromSearch(options);
          } else {
            targetID = ID;
          }
          if (ID) {
            await this.deleteResources();
          }
        }
      );
  }
}
