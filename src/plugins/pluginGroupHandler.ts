import { Command } from "commander";
import { BaseGroupHandler } from "../handlers/baseGroupHandler.js";
import { CLIoptions, options_toParams } from "../utils/cli.js";
import { PluginContextController } from "../controllers/pluginContextController.js";
import { pluginParameters_renderMan } from "../views/pluginParameters.js";
import { FilteredResourceData } from "@fnndsc/cumin";

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
   * Lists plugin parameters in a "man page" style format.
   * This is a specialized view for parameters that differs from the standard table view.
   *
   * @param options - CLI options for filtering.
   */
  async parameters_listMan(options: CLIoptions): Promise<void> {
    try {
      // We access the asset directly from the controller
      const asset = (this.controller.chrisObject as any).asset;
      
      if (!asset || typeof asset.resources_listAndFilterByOptions !== 'function') {
         console.error("Underlying resource does not support listing.");
         return;
      }

      const params = options_toParams(options);
      const results: FilteredResourceData | null = await asset.resources_listAndFilterByOptions(params);

      if (results) {
        pluginParameters_renderMan(results);
      } else {
        console.log("No parameters found.");
      }
    } catch (error) {
      console.error(`Error listing parameters: ${error}`);
    }
  }

  /**
   * Lists available fields for the current plugin context resource.
   */
  async parameters_fieldsList(): Promise<void> {
      if (this.baseGroupHandler) {
          await this.baseGroupHandler.resourceFields_list();
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
