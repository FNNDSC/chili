import {
  ChRISPluginMetaPluginGroup,
} from "@fnndsc/cumin";
import { BaseController } from "./baseController.js";
import { CLIoptions } from "../utils/cli.js";

import {
  pluginMeta_readmeContentFetch,
  pluginMeta_documentationUrlGet,
  pluginMeta_pluginIDFromSearch,
  PluginSearchOptions
} from "@fnndsc/salsa";

/**
 * Controller for managing ChRIS plugin metadata.
 */
export class PluginMetaController extends BaseController {
  constructor(chrisObject: ChRISPluginMetaPluginGroup) {
    super(chrisObject);
  }

  /**
   * Factory method to create a new PluginMetaController.
   *
   * @returns A new PluginMetaController instance.
   */
  static controller_create(): PluginMetaController {
    const chrisPluginMetaGroup = new ChRISPluginMetaPluginGroup();
    return new PluginMetaController(chrisPluginMetaGroup);
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
