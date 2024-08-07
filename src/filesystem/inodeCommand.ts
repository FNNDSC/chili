import { Command } from "commander";
import { FileGroupHandler, FileMemberHandler } from "./fileGroupHandler.js";

export function setupInodeCommand(program: Command): void {
  const inodeCommand = program
    .command("inode <path>")
    .description("Interact with ChRIS filesystem resources at a specific path")
    .action(async (path: string, options: any, command: Command) => {
      const args = command.args.slice(1);
      const subcommand = args[0];

      if (subcommand === "files") {
        const fileGroupHandler = await FileGroupHandler.create(path);
        const filesProgram = new Command();
        fileGroupHandler.setupCommand(filesProgram);
        await filesProgram.parseAsync(args);
      } else if (subcommand === "file") {
        const fileMemberHandler = await FileMemberHandler.create(path);
        const fileProgram = new Command();
        fileMemberHandler.setupCommand(fileProgram);
        await fileProgram.parseAsync(args);
      } else {
        console.error("Usage: chili inode <path> <files|file> [options]");
        command.help();
      }
    });
}
