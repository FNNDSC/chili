import { Command } from "commander";
import { BaseGroupHandler } from "../handlers/baseGroupHandler.js";
import { CLIoptions } from "../utils/cli.js";
import { PluginContextController } from "../controllers/pluginContextController.js";

class InitializationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InitializationError";
  }
}

/**
 * Handles commands related to groups of plugin contexts (computes, instances, parameters).
 */
export class PluginContextGroupHandler {
  private baseGroupHandler: BaseGroupHandler | null = null;
  private controller: PluginContextController;
  readonly assetName: string;

  private constructor(
    controller: PluginContextController,
    assetName: string
  ) {
    this.controller = controller;
    this.assetName = assetName;
    // Use 'any' cast here because BaseGroupHandler expects specific types but controller exposes generic BaseController interface property which might be broader.
    // In practice, ChRISEmbeddedResourceGroup<Plugin> is compatible.
    this.baseGroupHandler = new BaseGroupHandler(
      this.assetName,
      this.controller.chrisObject as any
    );
  }

  /**
   * Factory method to create a new PluginContextGroupHandler instance.
   *
   * @param assetName - The type of plugin context to handle ('computesofplugin', 'instancesofplugin', 'parametersofplugin').
   * @param id - Optional plugin ID. Defaults to current ChRIS plugin context.
   * @returns A Promise resolving to a new PluginContextGroupHandler instance.
   * @throws InitializationError if an unsupported asset type is provided.
   */
  static async handler_create(
    assetName: string,
    id?: number | null
  ): Promise<PluginContextGroupHandler> {
    try {
        const controller = await PluginContextController.controller_create(assetName, id);
        return new PluginContextGroupHandler(controller, assetName);
    } catch (error) {
        throw new InitializationError(`Failed to initialize PluginContextGroupHandler: ${error}`);
    }
  }

  /**
   * Sets up the Commander.js commands for plugin context group operations.
   *
   * @param program - The Commander.js program instance.
   */
  pluginContextGroupCommand_setup(program: Command): void {
    if (this.baseGroupHandler) {
      this.baseGroupHandler.command_setup(program);
    }

    const fileGroupCommand = program.commands.find(
      (cmd) => cmd.name() === this.assetName
    );
  }
}
