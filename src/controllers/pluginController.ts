import {
  ChRISPluginGroup,
  Dictionary,
  dictionary_fromCLI
} from "@fnndsc/cumin";
import { BaseController } from "./baseController.js";
import { CLIoptions } from "../utils/cli.js";
import {
  plugin_run as salsaPlugin_run,
  plugins_searchableToIDs as salsaPlugins_searchableToIDs,
} from "@fnndsc/salsa";

/**
 * Controller for managing ChRIS plugins.
 * Handles plugin searching, running, and group operations.
 */
export class PluginController extends BaseController {
  constructor(chrisObject: ChRISPluginGroup) {
    super(chrisObject);
  }

  /**
   * Factory method to create a new PluginController.
   *
   * @returns A new PluginController instance.
   */
  static controller_create(): PluginController {
    const chrisPluginGroup = new ChRISPluginGroup();
    return new PluginController(chrisPluginGroup);
  }

  /**
   * Provides an overview of plugin-group operations (placeholder).
   *
   * @returns A Promise resolving to void.
   */
  async plugins_overview(): Promise<void> {
    return Promise.resolve();
  }

  /**
   * Fetches detailed information for a specific plugin (placeholder).
   *
   * @param pluginId - The ID of the plugin.
   * @returns A Promise resolving to void (logging happens in handler for now, or should move here?).
   */
  async plugin_infoGet(pluginId: string): Promise<void> {
    // Placeholder, logic was mainly logging in handler
    return Promise.resolve();
  }

  /**
   * Runs a plugin instance.
   *
   * @param searchable - The plugin search string.
   * @param params - The plugin parameters.
   * @returns A Promise resolving to the created instance dictionary or null.
   */
  async plugin_run(searchable: string, params: string): Promise<Dictionary | null> {
    let parsedParams: Dictionary = {};
    try {
      parsedParams = dictionary_fromCLI(params);
    } catch (e) {
      console.error("Error parsing plugin parameters:", e);
      return null;
    }
    return await salsaPlugin_run(searchable, parsedParams);
  }

  /**
   * Resolves a searchable plugin string to a list of IDs.
   *
   * @param searchable - The search string.
   * @returns A Promise resolving to an array of IDs or null.
   */
  async plugin_searchableToIDs(searchable: string): Promise<string[] | null> {
    return await salsaPlugins_searchableToIDs(searchable);
  }
}
