import { Command } from "commander";
import { BaseGroupHandler } from "../handlers/baseGroupHandler.js";
import { ChRISPluginGroup } from "@fnndsc/cumin";
import { CLIoptions } from "../utils/cli";

export class PluginGroupHandler {
  private baseGroupHandler: BaseGroupHandler;
  assetName = "plugins";

  constructor() {
    const chrisPluginGroup = new ChRISPluginGroup();
    this.baseGroupHandler = new BaseGroupHandler(
      this.assetName,
      chrisPluginGroup
    );
  }

  async getPluginInfo(pluginId: string): Promise<void> {
    try {
      // This is a placeholder. Replace with actual implementation using cumin
      console.log(`Fetching info for plugin with ID: ${pluginId}`);
      // const pluginInfo = await this.asset.getPluginInfo(pluginId);
      // console.log(JSON.stringify(pluginInfo, null, 2));
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(`Error fetching plugin info: ${error.message}`);
      } else {
        console.error("An unknown error occurred while fetching plugin info");
      }
    }
  }

  setupCommand(program: Command): void {
    this.baseGroupHandler.setupCommand(program);

    const pluginCommand = program.commands.find(
      (cmd) => cmd.name() === this.assetName
    );

    if (pluginCommand) {
      pluginCommand
        .command("readme <pluginId>")
        .description("Get the readme of a specific plugin")
        .action(async (pluginId: string, options: CLIoptions) => {
          await this.getPluginInfo(pluginId);
        });
    } else {
      console.error(
        `Failed to find '${this.assetName}' command. The 'readme' subcommand was not added.`
      );
    }
  }
}
