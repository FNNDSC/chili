/**
 * @file Manages command groups and member operations for ChRIS files.
 *
 * This module defines the `FileGroupHandler` and `FileMemberHandler` classes,
 * which orchestrate CLI commands for lists of files and individual file operations.
 * It integrates various command modules to provide a cohesive interface.
 *
 * @module
 */
import { Command } from "commander";
import { BaseGroupHandler } from "../handlers/baseGroupHandler.js";
import { CLIoptions, path_resolveChrisFs } from "../utils/cli.js";
import { FileController } from "../controllers/fileController.js";
import { files_create } from "../commands/fs/create.js";
import { FilteredResourceData, errorStack } from "@fnndsc/cumin";
import { table_display } from "../screen/screen.js";
import { files_fetchList } from "../commands/files/list.js";
import { fileFields_fetch } from "../commands/files/fields.js";
import { files_searchByTerm, files_deleteById } from "../commands/files/delete.js";
import { prompt_confirm } from "../utils/ui.js";
import { files_viewContent } from "../commands/file/view.js";

/**
 * Handles commands related to groups of ChRIS files, links, or directories.
 */
export class FileGroupHandler {
  private baseGroupHandler: BaseGroupHandler; // Needs to be non-null for other commands
  private controller: FileController;
  readonly assetName: string;

  private constructor(
    controller: FileController,
    assetName: string
  ) {
    this.controller = controller;
    this.assetName = assetName;
    // baseGroupHandler will be used for fieldslist, delete, share until those are refactored
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
   * Removes duplicate column headers from FilteredResourceData results.
   * Copied from BaseGroupHandler to support local listing logic.
   */
  private columns_removeDuplicates(
    results: FilteredResourceData
  ): FilteredResourceData {
    const uniqueHeaders = Array.from(
      new Set(results.selectedFields)
    ) as string[];

    const uniqueTableData = results.tableData.map((row) =>
      uniqueHeaders.reduce<Record<string, any>>((acc, header) => {
        if (typeof header === "string" && header in row) {
          acc[header] = (row as Record<string, any>)[header];
        }
        return acc;
      }, {})
    );

    return {
      ...results,
      selectedFields: uniqueHeaders,
      tableData: uniqueTableData,
    };
  }

  /**
   * Lists files, links, or directories using the new command logic.
   */
  async files_list(options: CLIoptions, path?: string): Promise<void> {
    try {
      const results = await files_fetchList(options, this.assetName, path);

      if (!results) {
        console.error(
          `No ${this.assetName} resources found. Perhaps check your current context?`
        );
        return;
      }

      if (results.tableData.length === 0) {
        console.log(`No ${this.assetName} found matching the criteria.`);
      } else {
        const uniqueResults = this.columns_removeDuplicates(results);
        table_display(
          uniqueResults.tableData,
          uniqueResults.selectedFields,
          { title: { title: this.assetName, justification: "center" } }
        );
      }
    } catch (error) {
      // TODO: Refactor errorStack usage to RPN function calls if available
      console.log(errorStack.stack_search(this.assetName)[0]);
    }
  }

  /**
   * Lists file fields using the new command logic.
   */
  async files_fields(): Promise<void> {
    try {
      const fields = await fileFields_fetch(this.assetName);
      if (fields && fields.length > 0) {
        table_display(fields, ["fields"]);
      } else {
        console.log(`No resource fields found for ${this.assetName}.`);
      }
    } catch (error) {
      console.log(errorStack.stack_search(this.assetName)[0]);
    }
  }

  /**
   * Deletes files using the new command logic.
   */
  async files_delete(searchable: string, options: CLIoptions): Promise<void> {
    const searchParts = searchable.split("++").map((part) => part.trim());
    for (const searchPart of searchParts) {
      const items = await files_searchByTerm(searchPart, this.assetName);
      if (items.length === 0) {
        console.log(`No ${this.assetName} found matching: ${searchPart}`);
        continue;
      }

      for (const item of items) {
        const displayName = item.fname || item.path || item.id;
        if (!item.id) {
             console.error(`Cannot delete item without ID. Details: ${JSON.stringify(item)}`);
             continue;
        }

        console.log(`Preparing to delete ${this.assetName}: ID=${item.id}, Name=${displayName}`);

        if (!options.force) {
           const confirmed = await prompt_confirm(`Are you sure you want to delete ${this.assetName} ${displayName} (ID: ${item.id})?`);
           if (!confirmed) continue;
        }

        const success = await files_deleteById(item.id, this.assetName);
        if (success) {
            console.log(`Deleted ${this.assetName} ${item.id}`);
        } else {
            console.error(`Failed to delete ${this.assetName} ${item.id}`);
        }
      }
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
    const fileGroupCommand = program
      .command(this.assetName)
      .description(`Interact with a group of ChRIS ${this.assetName}`);

    fileGroupCommand
      .command("list [path]")
      .description(`list ${this.assetName}`)
      .option(
        "-p, --page <size>",
        "Page size (default 20)"
      )
      .option(
        "-f, --fields <fields>",
        `comma-separated list of ${this.assetName} fields to display`
      )
      .option(
        "-s, --search <searchTerms>",
        `search for ${this.assetName} using comma-separated key-value pairs`
      )
      .action(async (path, options: CLIoptions) => {
        await this.files_list(options, path);
      });
    
    fileGroupCommand
      .command("fieldslist")
      .description(`list the ${this.assetName} resource fields`)
      .action(async () => {
        await this.files_fields();
      });

    fileGroupCommand
      .command("delete <searchable>")
      .description(
        `delete target ${this.assetName} resolved from '++' separated <searchable>, i.e. "id:77++id:33"`
      )
      .option(
        "-f, --force",
        "force sharing (do not ask for user confirmation)"
      )
      .action(async (searchable: string, options: CLIoptions) => {
        await this.files_delete(searchable, options);
      });
    
    fileGroupCommand
      .command("share")
      .description(`share a (group of) ${this.assetName}`)
      .option(
        "-f, --force",
        "force sharing (do not ask for user confirmation)"
      )
      .action(async (options: CLIoptions) => {
        // Still delegates to baseGroupHandler for now
        await this.files_share(options);
      });
  }
}

/**
 * Handles commands related to individual ChRIS files.
 */
export class FileMemberHandler {
  private baseGroupHandler: BaseGroupHandler; // Needs to be non-null for other commands
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
   * Creates a new file in ChRIS with specified content.
   *
   * @param fileIdentifier - The primary argument for the file (name or path).
   * @param options - CLI options including `--content`, `--from-file`, `--path`, `--name`.
   */
  async file_create(fileIdentifier: string | undefined, options: CLIoptions): Promise<void> {
    try {
      // files_create now throws on error
      const success: boolean = await files_create(fileIdentifier, options);
      if (success) {
        const resolvedChRISPath: string = await path_resolveChrisFs(fileIdentifier, options);
        console.log(`File created successfully at: ${resolvedChRISPath}`);
      }
      // If success is false, files_create would have thrown an error which is caught below.
    } catch (error: unknown) {
      // Log the error from files_create
      const message = error instanceof Error ? error.message : String(error);
      console.error(message);
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
      .command("create [fileIdentifier]")
      .description("Create a new file in ChRIS with optional content")
      .option(
        "-c, --content <text>",
        "Inline content for the new file"
      )
      .option(
        "-f, --from-file <localPath>",
        "Path to a local file to upload as content"
      )
      .option(
        "-p, --path <path>",
        "Base ChRIS directory for the file (overrides current context if relative)"
      )
      .option(
        "-n, --name <name>",
        "Explicit filename (useful when fileIdentifier is a path or omitted)"
      )
      .action(async (fileIdentifier: string | undefined, options: CLIoptions) => {
        await this.file_create(fileIdentifier, options);
      });
    
    // TODO: Add cat/view command here
    // Note: The original file_cat was present but not hooked up in setup? 
    // Wait, looking at previous file, file_cat existed but wasn't in fileMemberCommand_setup?
    // Ah, I should add it.
    
    commandToUse
        .command("cat")
        .description("View the content of the file")
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
        const path = this.controller.path_get;
        console.log(`Viewing file at ${path}`);
        
        const content = await files_viewContent(path);
        
        if (content !== null) {
          console.log(content);
        } else {
          console.error("Failed to view file content (empty or error).");
        }
      }
      catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Error viewing file: ${message}`);
      }
    }
}