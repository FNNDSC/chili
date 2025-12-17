import { Command } from "commander";
import { ChRISPACSGroup } from "@fnndsc/cumin";
import { BaseGroupHandler } from "../handlers/baseGroupHandler.js";
import { CLIoptions } from "../utils/cli.js";

export class PACSServerGroupHandler {
  private baseGroupHandler: BaseGroupHandler;
  private assetName: string = "pacsservers";

  constructor() {
    const chrisObject: ChRISPACSGroup = new ChRISPACSGroup();
    this.baseGroupHandler = new BaseGroupHandler(this.assetName, chrisObject);
  }

  pacsServerCommand_setup(program: Command): void {
    const pacsServerCommand = program
      .command(this.assetName)
      .description("Interact with PACS servers");

    const listCommand = this.baseGroupHandler.baseListCommand_create(
      async (options: CLIoptions) => {
        await this.baseGroupHandler.resources_list(options);
      }
    );
    pacsServerCommand.addCommand(listCommand);

    pacsServerCommand
      .command("fieldslist")
      .description(`list the ${this.assetName} resource fields`)
      .action(async () => {
        await this.baseGroupHandler.resourceFields_list();
      });
  }
}
