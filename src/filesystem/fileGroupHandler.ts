import { Command } from "commander";
import { BaseGroupHandler } from "../handlers/baseGroupHandler.js";
import {
  ChRISFileSystemGroup,
  ChRISFilesGroup,
  ChRISLinksGroup,
  ChRISDirsGroup,
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

export class FileGroupHandler {
  private baseGroupHandler: BaseGroupHandler | null = null;
  private chrisFileSystemGroup: ChRISFileSystemGroup | null = null;
  private _path: string;
  readonly assetName: string;

  private constructor(
    chrisFileSystemGroup: ChRISFileSystemGroup,
    path: string,
    assetName: string
  ) {
    this._path = path;
    this.chrisFileSystemGroup = chrisFileSystemGroup;
    this.assetName = assetName;
    this.baseGroupHandler = new BaseGroupHandler(
      this.assetName,
      chrisFileSystemGroup
    );
  }

  static async create(
    assetName: string,
    path?: string
  ): Promise<FileGroupHandler> {
    if (!path) {
      const fileContext: string | null = chrisContext.getCurrent(
        Context.ChRISfolder
      );
      path = fileContext ? fileContext : "/";
    }

    let chrisFileSystemGroup: ChRISFileSystemGroup;

    switch (assetName) {
      case "files":
        chrisFileSystemGroup = await ChRISFilesGroup.create(path);
        break;
      case "links":
        chrisFileSystemGroup = await ChRISLinksGroup.create(path);
        break;
      case "dirs":
        chrisFileSystemGroup = await ChRISDirsGroup.create(path);
        break;
      default:
        throw new InitializationError(`Unsupported asset type: ${assetName}`);
    }

    return new FileGroupHandler(chrisFileSystemGroup, path, assetName);
  }

  async shareFiles(options: CLIoptions): Promise<void> {
    try {
      console.log(`Sharing ${this.assetName} from ${this._path}...`);
      if (options.force) {
        console.log("Force sharing enabled");
      }
      // Implement actual file sharing logic here
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(`Error sharing ${this.assetName}: ${error.message}`);
      } else {
        console.error(
          `An unknown error occurred while sharing the ${this.assetName}`
        );
      }
    }
  }

  setupCommand(program: Command): void {
    if (this.baseGroupHandler) {
      this.baseGroupHandler.setupCommand(program);
    }

    const fileGroupCommand = program.commands.find(
      (cmd) => cmd.name() === this.assetName
    );

    if (fileGroupCommand) {
      fileGroupCommand
        .command("share")
        .description(`share a (group of) ${this.assetName}`)
        .option(
          "-f, --force",
          "force sharing (do not ask for user confirmation)"
        )
        .action(async (options: CLIoptions) => {
          await this.shareFiles(options);
        });
    } else {
      console.error(
        `Failed to find '${this.assetName}' command. The 'share' subcommand was not added.`
      );
    }
  }
}

export class FileMemberHandler {
  private baseGroupHandler: BaseGroupHandler | null = null;
  private chrisFilesGroup: ChRISFilesGroup | null = null;
  private _path: string;
  assetName = "file";

  private constructor(chrisFilesGroup: ChRISFilesGroup, path: string) {
    this._path = path;
    this.chrisFilesGroup = chrisFilesGroup;
    this.baseGroupHandler = new BaseGroupHandler(
      this.assetName,
      chrisFilesGroup
    );
  }

  static async create(path: string): Promise<FileMemberHandler> {
    const chrisFilesGroup = await ChRISFilesGroup.create(path);
    return new FileMemberHandler(chrisFilesGroup, path);
  }

  setupCommand(program: Command): void {
    program
      .command("view")
      .description("view a file")
      .option(
        "-t, --type <filetype>",
        "explicit file type specifier (for better outputting)"
      )
      .action(async (options: CLIoptions) => {
        await this.catFile(options);
      });
    console.log("FileMemberHandler commands set up successfully");
  }

  async catFile(options: CLIoptions): Promise<void> {
    try {
      console.log(`Viewing file at ${this._path}`);
      // Implement actual file viewing logic here
      if (options.type) {
        console.log(`File type specified: ${options.type}`);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(`Error viewing file: ${error.message}`);
      } else {
        console.error("An unknown error occurred while viewing the file");
      }
    }
  }
}
