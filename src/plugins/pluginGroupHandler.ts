import { Command } from "commander";
import { BaseGroupHandler } from "../handlers/baseGroupHandler.js";
import {
  ChRISPluginSystemGroup,
  PluginInstances,
  PluginMeta,
  PluginComputeResources,
  PluginParameters,
  chrisContext,
  Context,
} from "@fnndsc/cumin";
import { CLIoptions } from "../utils/cli.js";

class InitializationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InitializationError";
  }
}

export class PluginContextGroupHandler {
  private baseGroupHandler: BaseGroupHandler | null = null;
  private chrisPluginSystemGroup: ChRISPluginSystemGroup | null = null;
  private _id: number | null;
  readonly assetName: string;

  private constructor(
    chrisPluginSystemGroup: ChRISPluginSystemGroup,
    id: number | null,
    assetName: string
  ) {
    this._id = id;
    this.chrisPluginSystemGroup = chrisPluginSystemGroup;
    this.assetName = assetName;
    this.baseGroupHandler = new BaseGroupHandler(
      this.assetName,
      chrisPluginSystemGroup
    );
  }

  static async create(
    assetName: string,
    id?: number | null
  ): Promise<PluginContextGroupHandler> {
    if (!id) {
      const pluginContext: number | null = Number(
        chrisContext.getCurrent(Context.ChRISplugin)
      );
      id = pluginContext ? pluginContext : 1;
    }

    let chrisPluginSystemGroup: ChRISPluginSystemGroup;

    switch (assetName) {
      case "plugincompute":
        chrisPluginSystemGroup = await PluginComputeResources.create(id);
        break;
      case "plugininstances":
        chrisPluginSystemGroup = await PluginInstances.create(id);
        break;
      case "pluginparameters":
        chrisPluginSystemGroup = await PluginParameters.create(id);
        break;
      default:
        throw new InitializationError(`Unsupported asset type: ${assetName}`);
    }

    return new PluginContextGroupHandler(chrisPluginSystemGroup, id, assetName);
  }

  setupCommand(program: Command): void {
    if (this.baseGroupHandler) {
      this.baseGroupHandler.setupCommand(program);
    }

    const fileGroupCommand = program.commands.find(
      (cmd) => cmd.name() === this.assetName
    );
  }
}
