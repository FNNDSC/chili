import { Command } from "commander";
import { BaseGroupHandler } from "../handlers/baseGroupHandler.js";
import { PluginMetaController } from "../controllers/pluginMetaController.js";

/**
 * Handles commands related to groups of plugin metadata.
 */
export class PluginMetaGroupHandler {
  private baseGroupHandler: BaseGroupHandler;
  private controller: PluginMetaController;
  assetName = "pluginMetas";

  constructor() {
    this.controller = PluginMetaController.controller_create();
    this.baseGroupHandler = new BaseGroupHandler(
      this.assetName,
      this.controller.chrisObject
    );
  }

  /**
   * Sets up the Commander.js commands for plugin metadata group operations.
   *
   * @param program - The Commander.js program instance.
   */
  pluginMetaGroupCommand_setup(program: Command): void {
    this.baseGroupHandler.command_setup(program);

    // The 'readme' command has been moved to pluginHandler.ts for consolidation.
    // This handler can be extended with other plugin metadata specific commands in the future.
  }
}

