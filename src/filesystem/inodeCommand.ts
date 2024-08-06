// inodeCommand.ts
import { Command } from "commander";
import { FileGroupHandler, FileMemberHandler } from "./fileGroupHandler.js";

export function setupInodeCommand(program: Command): Command {
  const inodeCommand = program
    .command("inode <path>")
    .description("Interact with ChRIS filesystem resources at a specific path")
    .action(async (path: string, options: any, command: Command) => {
      console.log(`Inode command executed for path: ${path}`);

      const filesCommand = command
        .createCommand("files")
        .description("Manage files in the specified path");

      const fileCommand = command
        .createCommand("file")
        .description("Interact with a single file in the specified path");

      const fileGroupHandler = new FileGroupHandler(path);
      await fileGroupHandler.initialize();
      fileGroupHandler.setupCommand(filesCommand);

      const fileMemberHandler = new FileMemberHandler(path);
      await fileMemberHandler.initialize();
      fileMemberHandler.setupCommand(fileCommand);

      command.addCommand(filesCommand);
      command.addCommand(fileCommand);
    });

  return inodeCommand;
}
