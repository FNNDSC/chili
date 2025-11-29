import { Command } from "commander";
import {
  FilteredResourceData,
  ChRISPluginGroup,
  ChRISFeedGroup,
  ChRISEmbeddedResourceGroup,
  ListOptions,
  QueryHits,
  record_extract,
  errorStack,
} from "@fnndsc/cumin";
import { CLIoptions, options_toParams } from "../utils/cli.js";
import { table_display, border_draw, TableOptions } from "../screen/screen.js";
import * as util from "util";
import * as readline from "readline";
import { title } from "process";
import { Table } from "cli-table3";

/**
 * Base handler for groups of ChRIS resources.
 * Provides common functionality for listing and deleting resources.
 */
export class BaseGroupHandler {
  assetName: string = "";
  displayOptions: TableOptions;
  chrisObject:
    | ChRISPluginGroup
    | ChRISFeedGroup
    | ChRISEmbeddedResourceGroup<any>;

  constructor(
    assetName: string,
    chrisObject:
      | ChRISPluginGroup
      | ChRISFeedGroup
      | ChRISEmbeddedResourceGroup<any>
  ) {
    this.assetName = assetName;
    this.chrisObject = chrisObject;
    this.displayOptions = {
      title: { title: this.assetName, justification: "center" },
    };
  }

  /**
   * Removes duplicate column headers from FilteredResourceData results.
   *
   * @param results - The FilteredResourceData to process.
   * @returns FilteredResourceData with unique headers and corresponding data.
   */
  private columns_removeDuplicates(
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

  /**
   * Lists ChRIS resources based on provided CLI options.
   *
   * @param options - CLI options for filtering and pagination.
   */
  async resources_list(options: CLIoptions): Promise<void> {
    try {
      const params = options_toParams(options);
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
        const uniqueResults = this.columns_removeDuplicates(results);
        table_display(
          uniqueResults.tableData,
          uniqueResults.selectedFields,
          this.displayOptions
        );
      }
    } catch (error) {
      console.log(errorStack.stack_search(this.assetName)[0]);
    }
  }

  /**
   * Lists available fields for the current ChRIS resource type.
   */
  async resourceFields_list(): Promise<void> {
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
        table_display(results.fields, ["fields"]);
      }
    } catch (error) {
      console.log(errorStack.stack_search(this.assetName)[0]);
    }
  }

  /**
   * Prompts the user for confirmation before performing an operation.
   *
   * @param ID - The ID of the resource.
   * @param opName - The name of the operation.
   * @returns A Promise resolving to true if confirmed, false otherwise.
   */
  private async operation_confirm(ID: number, opName: string): Promise<boolean> {
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

  /**
   * Prints details of a specific resource by its ID.
   *
   * @param ID - The ID of the resource.
   * @param fields - Optional comma-separated list of fields to display.
   */
  async resource_printGivenID(ID: number, fields?: string): Promise<void> {
    if (!fields) {
      if (this.chrisObject instanceof ChRISFeedGroup) {
        fields = "id,name,creation_date,owner_username";
      } else {
        fields = "";
      }
    }
    await this.resources_list({
      fields: fields,
      search: `id: ${ID}`,
    });
  }

  /**
   * Prompts the user to continue an operation after displaying resource info.
   *
   * @param ID - The ID of the resource.
   * @param operation - The name of the operation.
   * @param fields - Optional comma-separated list of fields to display.
   * @returns A Promise resolving to true if confirmed, false otherwise.
   */
  async user_confirmContinuation(
    ID: number,
    operation: string,
    fields?: string
  ): Promise<boolean> {
    await this.resource_printGivenID(ID);
    const confirmed = await this.operation_confirm(ID, operation);
    return confirmed;
  }

  /**
   * Generates an "OK" or "Failed" message based on a boolean condition.
   *
   * @param obj - The object to check (truthy implies OK).
   * @param failureNotice - Optional custom failure message.
   * @returns The formatted status message.
   */
  msg_OKorNot(obj: unknown, failureNotice?: string): string {
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

  /**
   * Deletes ChRIS resources by their IDs.
   *
   * @param IDs - An array of resource IDs to delete.
   * @param force - If true, bypasses user confirmation.
   * @returns A Promise resolving to true on success, false on failure.
   */
  async resources_delete(IDs: number[], force: boolean): Promise<boolean> {
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
        console.log(
          border_draw(
            `checking ${this.assetName} id ${id} ... ${this.msg_OKorNot(
              searchResults
            )}`
          )
        );
        if (!force) {
          confirm = await this.user_confirmContinuation(id, "delete");
          if (!confirm) {
            continue;
          }
        }
        delop = await this.chrisObject.asset.resourceItem_delete(id);
        border_draw(
          `deleting ${this.assetName} id ${id} ... ${this.msg_OKorNot(true)}`
        );
      } catch (error) {
        console.error(`${error}`);
        return false;
      }
    }
    return true;
  }

  /**
   * Retrieves resource IDs based on search options.
   *
   * @param options - CLI options for searching.
   * @returns A Promise resolving to an array of IDs or null if no matches.
   */
  async IDs_getFromSearch(options: CLIoptions): Promise<number[] | null> {
    const params: ListOptions = options_toParams(options);
    const searchResults: FilteredResourceData | null =
      await this.chrisObject.asset.resources_listAndFilterByOptions(params);
    if (!searchResults) {
      return null;
    }
    const queryHits: QueryHits = record_extract(
      searchResults.tableData,
      "id"
    );
    return queryHits.hits as number[];
  }

  /**
   * Handles the deletion of resources based on CLI options.
   *
   * @param options - CLI options including search terms and force flag.
   */
  async delete_handle(options: CLIoptions): Promise<void> {
    let nIDs: number[] | null;
    nIDs = await this.IDs_getFromSearch(options);
    if (!nIDs) {
      console.error(`No ${this.assetName} matched the search criteria.`);
      return;
    }
    if (nIDs) {
      await this.resources_delete(nIDs, options.force);
    }
  }

  /**
   * Sets up the Commander.js commands for resource listing and deletion.
   *
   * @param program - The Commander.js program instance.
   */
  command_setup(program: Command): void {
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
      .action(async (options: CLIoptions) => {
        await this.resources_list(options);
      });

    command
      .command("fieldslist")
      .description(`list the ${this.assetName} resource fields`)
      .action(async () => {
        await this.resourceFields_list();
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
          await this.delete_handle(currentOptions);
        }
      });
  }
}