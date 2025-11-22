import {
  ChRISEmbeddedResourceGroup,
  objContext_create,
  chrisContext,
  Context,
} from "@fnndsc/cumin";
import { BaseController } from "./baseController.js";
import { Plugin } from "@fnndsc/chrisapi";

/**
 * Controller for managing plugin context resources (computes, instances, parameters).
 */
export class PluginContextController extends BaseController {
  private _id: number | null;
  private _assetName: string;

  constructor(
    chrisObject: ChRISEmbeddedResourceGroup<Plugin>,
    id: number | null,
    assetName: string
  ) {
    super(chrisObject);
    this._id = id;
    this._assetName = assetName;
  }

  /**
   * Factory method to create a new PluginContextController instance.
   *
   * @param assetName - The type of plugin context to handle ('computesofplugin', 'instancesofplugin', 'parametersofplugin').
   * @param id - Optional plugin ID. Defaults to current ChRIS plugin context.
   * @returns A Promise resolving to a new PluginContextController instance.
   * @throws Error if an unsupported asset type is provided or initialization fails.
   */
  static async controller_create(
    assetName: string,
    id?: number | null
  ): Promise<PluginContextController> {
    if (!id) {
      const pluginContext: string | null = await chrisContext.current_get(
        Context.ChRISplugin
      );
      id = pluginContext ? Number(pluginContext) : 1;
    }

    let chrisPluginSystemGroup: ChRISEmbeddedResourceGroup<Plugin> | null = null;

    switch (assetName) {
      case "computesofplugin":
        chrisPluginSystemGroup = (await objContext_create(
          "ComputesOfPlugin",
          `plugin:${id}`
        )) as ChRISEmbeddedResourceGroup<Plugin>;
        break;
      case "instancesofplugin":
        chrisPluginSystemGroup = (await objContext_create(
          "InstancesOfPlugin",
          `plugin:${id}`
        )) as ChRISEmbeddedResourceGroup<Plugin>;
        break;
      case "parametersofplugin":
        chrisPluginSystemGroup = (await objContext_create(
          "ParametersOfPlugin",
          `plugin:${id}`
        )) as ChRISEmbeddedResourceGroup<Plugin>;
        break;
      default:
        throw new Error(`Unsupported asset type: ${assetName}`);
    }

    if (!chrisPluginSystemGroup) {
        throw new Error(`Failed to initialize plugin context group for ${assetName}`);
    }

    return new PluginContextController(chrisPluginSystemGroup, id, assetName);
  }
}
