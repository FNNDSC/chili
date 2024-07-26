import { Command } from "commander";
import { BaseHandler } from '../handlers/baseHandler.js';
import { ChRISPlugin } from "@fnndsc/cumin";
import { CLIoptions } from '../utils/cli';

export class PluginHandler {
  private baseHandler: BaseHandler;
  assetName = "plugins";

  constructor() {
    const chrisPlugin = new ChRISPlugin();
    this.baseHandler = new BaseHandler(this.assetName, chrisPlugin);
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
        console.error('An unknown error occurred while fetching plugin info');
      }
    }
  }

  setupCommand(program: Command): void {
    this.baseHandler.setupCommand(program);

    const pluginCommand = program.commands.find(cmd => cmd.name() === this.assetName);
    
    if (pluginCommand) {
      pluginCommand
        .command("info <pluginId>")
        .description("Get detailed information about a specific plugin")
        .action(async (pluginId: string, options: CLIoptions) => {
          await this.getPluginInfo(pluginId);
        });
    } else {
      console.error(`Failed to find '${this.assetName}' command. The 'info' subcommand was not added.`);
    }
  }
}
