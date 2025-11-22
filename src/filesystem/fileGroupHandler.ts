import { Command } from "commander";
import { BaseGroupHandler } from "../handlers/baseGroupHandler.js";
import { CLIoptions } from "../utils/cli.js";
import { FileController } from "../controllers/fileController.js";

/**
 * Handles commands related to groups of ChRIS files, links, or directories.
 */
export class FileGroupHandler {
  private baseGroupHandler: BaseGroupHandler | null = null;
  private controller: FileController;
  readonly assetName: string;

  private constructor(
    controller: FileController,
    assetName: string
  ) {
    this.controller = controller;
    this.assetName = assetName;
    this.baseGroupHandler = new BaseGroupHandler(
      this.assetName,
      this.controller.chrisObject
    );
  }

  /**
   * Factory method to create a new FileGroupHandler instance.
   *
   * @param assetName - The type of asset to handle ('files', 'links', 'dirs').
   * @param path - Optional path within ChRIS FS. Defaults to current ChRIS folder context.
   * @returns A Promise resolving to a new FileGroupHandler instance.
   */
  static async handler_create(
    assetName: string,
    path?: string
  ): Promise<FileGroupHandler> {
    try {
      const controller = await FileController.handler_create(assetName, path);
      if (controller === null) {
        throw new Error(`Failed to create FileController for asset type: ${assetName}`);
      }
      return new FileGroupHandler(controller, assetName);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to initialize FileGroupHandler for ${assetName}: ${errorMessage}`);
    }
  }

  /**
   * Handles sharing of ChRIS files.
   *
   * @param options - CLI options for sharing files.
   */
  async files_share(options: CLIoptions): Promise<void> {
    try {
      console.log(`Sharing ${this.assetName} from ${this.controller.path_get}...`);
      if (options.force) {
        console.log("Force sharing enabled");
      }
      await this.controller.files_share(options);
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

  /**
   * Sets up the Commander.js commands for file group operations.
   *
   * @param program - The Commander.js program instance.
   */
  fileGroupCommand_setup(program: Command): void {
    if (this.baseGroupHandler) {
      this.baseGroupHandler.command_setup(program);
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
          await this.files_share(options);
        });
    } else {
      console.error(
        `Failed to find '${this.assetName}' command. The 'share' subcommand was not added.`
      );
    }
  }
}

/**
 * Handles commands related to individual ChRIS files.
 */
export class FileMemberHandler {
  private baseGroupHandler: BaseGroupHandler | null = null;
  private controller: FileController;
  assetName = "file";

  private constructor(
    controller: FileController
  ) {
    this.controller = controller;
    this.baseGroupHandler = new BaseGroupHandler(
      this.assetName,
      this.controller.chrisObject
    );
  }

  /**
   * Factory method to create a new FileMemberHandler instance.
   *
   * @param path - The path to the individual file.
   * @returns A Promise resolving to a new FileMemberHandler instance.
   */
  static async handler_create(path: string): Promise<FileMemberHandler> {
    try {
      const controller = await FileController.member_create(path);
      if (controller === null) {
        throw new Error(`Failed to create FileController for path: ${path}`);
      }
      return new FileMemberHandler(controller);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to initialize FileMemberHandler for path ${path}: ${errorMessage}`);
    }
  }

  /**
   * Sets up the Commander.js commands for individual file operations.
   *
   * @param program - The Commander.js program instance.
   */
  fileMemberCommand_setup(program: Command): void {
    const fileCommand = program
      .command(this.assetName)
      .description(`Interact with a single ChRIS ${this.assetName}`);
    
    const existingCommand = program.commands.find(cmd => cmd.name() === this.assetName);
    const commandToUse = existingCommand || fileCommand;

    commandToUse
      .command("view")
      .description("view a file")
      .option(
        "-t, --type <filetype>",
        "explicit file type specifier (for better outputting)"
      )
      .action(async (options: CLIoptions) => {
        await this.file_cat(options);
      });
    console.log("FileMemberHandler commands set up successfully");
  }

  /**
   * Displays the content of the file.
   *
   * @param options - CLI options for viewing the file.
   */
  async file_cat(options: CLIoptions): Promise<void> {
    try {
      console.log(`Viewing file at ${this.controller.path_get}`);
      if (options.type) {
        console.log(`File type specified: ${options.type}`);
      }
      await this.controller.file_view(options);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(`Error viewing file: ${error.message}`);
      } else {
        console.error("An unknown error occurred while viewing the file");
      }
    }
  }
}