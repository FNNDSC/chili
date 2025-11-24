import * as fs from 'fs';
import * as path from 'path';
import { Command } from 'commander';

export async function dirContents_list(filepath: string) {
  try {
    const files = await fs.promises.readdir(filepath);
    const detailedFilesPromises = files.map(async (file: string) => {
      let fileDetails = await fs.promises.lstat(path.resolve(filepath, file));
      const { size, birthtime } = fileDetails;
      return { filename: file, "size(KB)": size, created_at: birthtime };
    });
    const detailedFiles = await Promise.all(detailedFilesPromises);
    console.table(detailedFiles);
  } catch (error) {
    console.error("Error occurred while reading the directory!", error);
  }
}

export function dir_create(filepath: string) {
  if (!fs.existsSync(filepath)) {
    fs.mkdirSync(filepath);
    console.log("The directory has been created successfully");
  }
}

export function file_create(filepath: string) {
  fs.openSync(filepath, "w");
  console.log("An empty file has been created");
}

export function lfsCommand_setup(program: Command) {
  const lfs = program.command('lfs')
    .description('Local filesystem operations');

  lfs.command('ls [directory]')
    .description('List directory contents')
    .action(async (directory = process.cwd()) => {
      await dirContents_list(directory);
    });

  lfs.command('mkdir <directory>')
    .description('Create a directory')
    .action((directory) => {
      dir_create(path.resolve(process.cwd(), directory));
    });

  lfs.command('touch <file>')
    .description('Create a file')
    .action((file) => {
      file_create(path.resolve(process.cwd(), file));
    });
}
