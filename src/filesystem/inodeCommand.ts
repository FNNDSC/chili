import { Command } from "commander";
import { FileGroupHandler, FileMemberHandler } from "./fileGroupHandler.js";

/**
 * Sets up the 'inode' command for interacting with ChRIS filesystem resources.
 *
 * @param program - The Commander.js program instance.
 */
export async function inodeCommand_setup(program: Command): Promise<void> {
  const inodeCommand = program
    .command("inode <path>")
    .description("Interact with ChRIS filesystem resources at a specific path")
    .action(async (path: string, options: Record<string, unknown>, command: Command) => {
      const args = command.args.slice(1);
      const subcommand = args[0];

      if (subcommand === "files") {
        const fileGroupHandler = await FileGroupHandler.handler_create("files", path);
        const filesProgram = new Command();
        fileGroupHandler.fileGroupCommand_setup(filesProgram);
        await filesProgram.parseAsync(args);
      } else if (subcommand === "file") {
        const fileMemberHandler = await FileMemberHandler.handler_create(path);
        const fileProgram = new Command();
        fileMemberHandler.fileMemberCommand_setup(fileProgram);
        await fileProgram.parseAsync(args);
      } else {
        console.error("Usage: chili inode <path> <files|file> [options]");
        command.help();
      }
    });
}
