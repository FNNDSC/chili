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
  pluginMeta_readmeContentFetch,
  pluginMeta_documentationUrlGet,
  pluginMeta_pluginIDFromSearch,
  PluginSearchOptions
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

  /**
   * Retrieves the raw README content from a repository URL.
   *
   * @param repoUrl - The base URL of the plugin repository.
   * @returns A Promise resolving to the README content string or null if not found.
   */
  async readmeContent_fetch(repoUrl: string): Promise<string | null> {
    return await pluginMeta_readmeContentFetch(repoUrl);
  }

  /**
   * Retrieves the documentation URL for a specific plugin ID.
   *
   * @param pluginId - The ID of the plugin.
   * @returns A Promise resolving to the documentation URL or null.
   */
  async documentationUrl_get(pluginId: string): Promise<string | null> {
    return await pluginMeta_documentationUrlGet(pluginId);
  }

  /**
   * Retrieves a plugin ID based on search options.
   *
   * @param options - CLI options for searching for a plugin.
   * @returns A Promise resolving to the plugin ID as a string, or null if not found/ambiguous.
   */
  async pluginID_fromSearch(options: CLIoptions): Promise<string | null> {
    return await pluginMeta_pluginIDFromSearch(options as PluginSearchOptions);
  }
}
