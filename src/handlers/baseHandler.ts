import { Command } from "commander";
import { FilteredResourceData, ChRISResource, ChRISPlugin, ChRISFeed } from "@fnndsc/cumin";
import { CLIoptions, optionsToParams } from '../utils/cli.js';

export class BaseHandler {
  assetName: string = "";
  chrisObject: ChRISPlugin | ChRISFeed;
 
  constructor(assetName: string, chrisObject: ChRISPlugin|ChRISFeed) {
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
        console.error(`An error occurred while listing ${this.assetName}:`, error);
      }
    }

    async listResourceFields(): Promise<void> {
        try {
          const results = await this.chrisObject.asset.resourceFields_get();
        
          if (!results) {
            console.error(`An error occurred while fetching resource fields for ${this.assetName}.`);
            return;
          }

          if (results.fields.length === 0) {
            console.log(`No resource fields found for ${this.assetName}.`);
          } else {
            console.table(results.fields);
          }
        } catch (error) {
          console.error(`An error occurred while listing ${this.assetName} resource fields:`, error);
        }
    }

  setupCommand(program: Command): void {
    const command = program
      .command(this.assetName)
      .description(`Interact with ChRIS ${this.assetName}`);

    command
      .command("list")
      .description(`List ${this.assetName}`)
      .option("-p, --page <size>", "Page size (default 20)")
      .option(
        "-f, --fields <fields>",
        "Comma-separated list of fields to display",
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

    // Add any additional common commands here
  }
}