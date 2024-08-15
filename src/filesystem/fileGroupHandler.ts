// fileGroupHandler.ts
import { Command } from "commander";
import { BaseGroupHandler } from "../handlers/baseGroupHandler.js";
import { ChRISFilesGroup, chrisContext, Context } from "@fnndsc/cumin";
import { CLIoptions } from "../utils/cli.js";

class InitializationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InitializationError";
  }
}

export class FileGroupHandler {
  private baseGroupHandler: BaseGroupHandler | null = null;
  private chrisFilesGroup: ChRISFilesGroup | null = null;
  private _path: string;
  assetName = "files";

  constructor(chrisFilesGroup: ChRISFilesGroup, path: string) {
    this._path = path;
    this.chrisFilesGroup = chrisFilesGroup;
    this.baseGroupHandler = new BaseGroupHandler(
      this.assetName,
      chrisFilesGroup
    );
  }

  static async create(path?: string): Promise<FileGroupHandler> {
    if (!path) {
      const fileContext: string | null = chrisContext.getCurrent(
        Context.ChRISfolder
      );
      path = fileContext ? fileContext : "/";
    }
    console.log("Setting file context to ", path);
    const chrisFilesGroup = await ChRISFilesGroup.create(path);
    return new FileGroupHandler(chrisFilesGroup, path);
  }

  async shareFiles(options: CLIoptions): Promise<void> {
    try {
      console.log(`Sharing files from ${this._path}...`);
      if (options.force) {
        console.log("Force sharing enabled");
      }
      // Implement actual file sharing logic here
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(`Error sharing file(s): ${error.message}`);
      } else {
        console.error("An unknown error occurred while sharing the file(s)");
      }
    }
  }

  setupCommand(program: Command): void {
    console.log("Setting up FileGroupHandler commands");
    if (this.baseGroupHandler) {
      this.baseGroupHandler.setupCommand(program);
    }

    const fileGroupCommand = program.commands.find(
      (cmd) => cmd.name() === this.assetName
    );

    if (fileGroupCommand) {
      fileGroupCommand
        .command("share")
        .description("share a (group of) file(s)")
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
    console.log("Setting up FileMemberHandler commands");
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
