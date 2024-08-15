import { Command } from "commander";
import {
  FilteredResourceData,
  ChRISPluginGroup,
  ChRISFeedGroup,
  ChRISFilesGroup,
  ListOptions,
  QueryHits,
  extractRecordToQueryHits,
  chrisContext,
  Context,
} from "@fnndsc/cumin";
import { CLIoptions, optionsToParams } from "../utils/cli.js";
import * as util from "util";
import * as readline from "readline";
import { FileGroupHandler } from "../filesystem/fileGroupHandler.js";

export class BaseGroupHandler {
  assetName: string = "";
  chrisObject: ChRISPluginGroup | ChRISFeedGroup | ChRISFilesGroup;

  constructor(
    assetName: string,
    chrisObject: ChRISPluginGroup | ChRISFeedGroup | ChRISFilesGroup
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

  private async confirmOperation(ID: number, opName: string): Promise<boolean> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise((resolve) => {
      rl.question(
        `Are you sure you want to ${opName} ${this.assetName} resource id ${ID}? (y/N) `,
        (answer) => {
          rl.close();
          resolve(answer.toLowerCase() === "y");
        }
      );
    });
  }

  async resource_printGivenID(ID: number, fields?: string): Promise<void> {
    if (!fields) {
      if (this.chrisObject instanceof ChRISFeedGroup) {
        fields = "id,name,creation_date,owner_username";
      } else {
        fields = "id";
      }
    }
    await this.listResources({
      fields: fields,
      search: `id: ${ID}`,
    });
  }

  async userContinue(
    ID: number,
    operation: string,
    fields?: string
  ): Promise<boolean> {
    await this.resource_printGivenID(ID);
    const confirmed = await this.confirmOperation(ID, operation);
    return confirmed;
  }

  OKorNot_echo(obj: any | null, failureNotice?: string): void {
    let failMessage: string;
    if (!failureNotice) {
      failMessage = "[ Failed ]";
    } else {
      failMessage = failureNotice;
    }
    if (obj) {
      console.log("[ OK ]");
    } else {
      console.log(failMessage);
    }
  }

  async deleteResources(IDs: number[], force: boolean): Promise<boolean> {
    let delop: boolean = true;
    let confirm: boolean = false;
    for (const id of IDs) {
      try {
        process.stdout.write(
          util.format("checking %s id %d... ", this.assetName, id)
        );
        const searchResults: FilteredResourceData | null =
          await this.chrisObject.asset.resources_listAndFilterByOptions({
            id: id,
          });
        this.OKorNot_echo(searchResults);
        if (!force) {
          confirm = await this.userContinue(id, "delete");
          if (!confirm) {
            continue;
          }
        }
        process.stdout.write(
          util.format("deleting %s id %d... ", this.assetName, id)
        );
        delop = await this.chrisObject.asset.resourceItem_delete(id);
        this.OKorNot_echo(true);
      } catch (error) {
        console.error(`${error}`);
        return false;
      }
    }
    return true;
  }

  async IDs_getFromSearch(options: CLIoptions): Promise<number[] | null> {
    const params: ListOptions = optionsToParams(options);
    const searchResults: FilteredResourceData | null =
      await this.chrisObject.asset.resources_listAndFilterByOptions(params);
    if (!searchResults) {
      return null;
    }
    const queryHits: QueryHits = extractRecordToQueryHits(
      searchResults.tableData,
      "id"
    );
    return queryHits.hits;
  }

  setupCommand(program: Command): void {
    const command = program
      .command(this.assetName)
      .description(`Interact with a group of ChRIS ${this.assetName}`);

    command
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
      .action(async (options) => {
        await this.listResources(options);
      });

    command
      .command("fieldslist")
      .description(`list the ${this.assetName} resource fields`)
      .action(async () => {
        await this.listResourceFields();
      });

    command
      .command("delete [IDs]")
      .description(
        `delete target ${this.assetName} -- either by direct ID (comma separated list) or specified in a --search`
      )
      .option(
        "-s, --search <searchTerms>",
        `search for ${this.assetName} using a comma-separated key-value pairs`
      )
      .option(
        "-f, --force",
        `force the deletion without prompting for user confirmation`
      )
      .action(
        async (
          ID: string | undefined,
          options: CLIoptions & { search?: string }
        ) => {
          let nIDs: number[] | null;
          if (ID === undefined) {
            nIDs = await this.IDs_getFromSearch(options);
            if (!nIDs) {
              console.error(
                `No ${this.assetName} matched the search criteria.`
              );
              return;
            }
          } else {
            const sIDs: string[] = ID.split(",");
            nIDs = sIDs.map(Number);
          }
          if (nIDs) {
            await this.deleteResources(nIDs, options.force);
          }
        }
      );
  }
}
