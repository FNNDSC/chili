// fileGroupHandler.ts
import { Command } from "commander";
import { BaseGroupHandler } from "../handlers/baseGroupHandler.js";
import { ChRISFilesGroup } from "@fnndsc/cumin";
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

  constructor(path: string) {
    this._path = path;
  }

  async initialize(): Promise<void> {
    try {
      console.log(`Initializing FileGroupHandler for path: ${this._path}`);
      this.chrisFilesGroup = await ChRISFilesGroup.create(this._path);
      if (!this.chrisFilesGroup) {
        throw new InitializationError("Failed to create ChRISFilesGroup");
      }
      this.baseGroupHandler = new BaseGroupHandler(
        this.assetName,
        this.chrisFilesGroup
      );
      console.log("FileGroupHandler initialized successfully");
    } catch (error) {
      console.error("An initialization error occurred:");
      console.error(error);
      throw new InitializationError("Failed to initialize FileGroupHandler");
    }
  }

  setupCommand(program: Command): void {
    console.log("Setting up FileGroupHandler commands");
    if (this.baseGroupHandler) {
      this.baseGroupHandler.setupCommand(program);
    }

    program
      .command("share")
      .description("share a (group of) file(s)")
      .option("-f, --force", "force sharing (do not ask for user confirmation)")
      .action(async (options: CLIoptions) => {
        await this.shareFiles(options);
      });

    console.log("FileGroupHandler commands set up successfully");
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
}

export class FileMemberHandler {
  private _path: string;
  private assetName: string = "file";

  constructor(path: string) {
    this._path = path;
  }

  async initialize(): Promise<void> {
    try {
      console.log(`Initializing FileMemberHandler for path: ${this._path}`);
      // Add any necessary initialization logic here
      console.log("FileMemberHandler initialized successfully");
    } catch (error) {
      console.error("An initialization error occurred:");
      console.error(error);
      throw new InitializationError("Failed to initialize FileMemberHandler");
    }
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
