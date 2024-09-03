import { Command } from "commander";
import {
  FilteredResourceData,
  ChRISPluginGroup,
  ChRISFeedGroup,
  ChRISFileSystemGroup,
  ChRISPluginSystemGroup,
  ListOptions,
  QueryHits,
  extractRecordToQueryHits,
  errorStack,
} from "@fnndsc/cumin";
import { CLIoptions, optionsToParams } from "../utils/cli.js";
import { displayTable, drawBorder, TableOptions } from "../screen/screen.js";
import * as util from "util";
import * as readline from "readline";
import { title } from "process";
import { Table } from "cli-table3";

export class BaseGroupHandler {
  assetName: string = "";
  displayOptions: TableOptions;
  chrisObject:
    | ChRISPluginGroup
    | ChRISFeedGroup
    | ChRISFileSystemGroup
    | ChRISPluginSystemGroup;

  constructor(
    assetName: string,
    chrisObject:
      | ChRISPluginGroup
      | ChRISFeedGroup
      | ChRISFileSystemGroup
      | ChRISPluginSystemGroup
  ) {
    this.assetName = assetName;
    this.chrisObject = chrisObject;
    this.displayOptions = {
      title: { title: this.assetName, justification: "center" },
    };
  }

  private removeDuplicateColumns(
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

  async listResources(options: CLIoptions): Promise<void> {
    try {
      const params = optionsToParams(options);
      const results: FilteredResourceData | null =
        await this.chrisObject.asset.resources_listAndFilterByOptions(params);

      if (!results) {
        console.error(
          `No ${this.assetName} resources found. Perhaps check your current context?`
        );
        return;
      }

      if (results.tableData.length === 0) {
        console.log(`No ${this.assetName} found matching the criteria.`);
      } else {
        const uniqueResults = this.removeDuplicateColumns(results);
        displayTable(
          uniqueResults.tableData,
          uniqueResults.selectedFields,
          this.displayOptions
        );
      }
    } catch (error) {
      console.log(errorStack.searchStack(this.assetName)[0]);
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
        displayTable(results.fields, ["fields"]);
      }
    } catch (error) {
      console.log(errorStack.searchStack(this.assetName)[0]);
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

  OKorNot_msg(obj: any | null, failureNotice?: string): string {
    let failMessage: string;
    if (!failureNotice) {
      failMessage = "[ Failed ]";
    } else {
      failMessage = failureNotice;
    }
    if (obj) {
      return "[ OK ]";
    } else {
      return failMessage;
    }
  }

  async deleteResources(IDs: number[], force: boolean): Promise<boolean> {
    let delop: boolean = true;
    let confirm: boolean = false;
    let title: string = "";
    let OKorNot: string = "";
    for (const id of IDs) {
      try {
        const searchResults: FilteredResourceData | null =
          await this.chrisObject.asset.resources_listAndFilterByOptions({
            id: id,
          });
        drawBorder(
          `checking ${this.assetName} id ${id} ... ${this.OKorNot_msg(
            searchResults
          )}`,
          { bottom: false }
        );
        if (!force) {
          confirm = await this.userContinue(id, "delete");
          if (!confirm) {
            continue;
          }
        }
        delop = await this.chrisObject.asset.resourceItem_delete(id);
        drawBorder("errr... is this working?");
        drawBorder(
          `deleting ${this.assetName} id ${id} ... ${this.OKorNot_msg(true)}`
        );
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

  async deleteHandler(options: CLIoptions): Promise<void> {
    let nIDs: number[] | null;
    nIDs = await this.IDs_getFromSearch(options);
    if (!nIDs) {
      console.error(`No ${this.assetName} matched the search criteria.`);
      return;
    }
    if (nIDs) {
      await this.deleteResources(nIDs, options.force);
    }
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
      .command("delete <searchable>")
      .description(
        `delete target ${this.assetName} resolved from '++' separated <searchable>, i.e. "id:77++id:33"`
      )
      .option(
        "-f, --force",
        `force the deletion without prompting for user confirmation`
      )
      .action(async (searchable: string, options: CLIoptions) => {
        const searchParts = searchable.split("++").map((part) => part.trim());
        // console.log(`searchParts = ${searchParts}`);
        for (const searchPart of searchParts) {
          const currentOptions: CLIoptions = {
            ...options,
            search: searchPart,
          };
          await this.deleteHandler(currentOptions);
        }
      });
  }
}
