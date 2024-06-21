import * as fs from 'fs';
import * as path from 'path';
import { Command } from 'commander';

export async function listDirContents(filepath: string) {
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

export function createDir(filepath: string) {
  if (!fs.existsSync(filepath)) {
    fs.mkdirSync(filepath);
    console.log("The directory has been created successfully");
  }
}

export function createFile(filepath: string) {
  fs.openSync(filepath, "w");
  console.log("An empty file has been created");
}

export function setupLfsCommand(program: Command) {
  const lfs = program.command('lfs')
    .description('Local filesystem operations');

  lfs.command('ls [directory]')
    .description('List directory contents')
    .action(async (directory = process.cwd()) => {
      await listDirContents(directory);
    });

  lfs.command('mkdir <directory>')
    .description('Create a directory')
    .action((directory) => {
      createDir(path.resolve(process.cwd(), directory));
    });

  lfs.command('touch <file>')
    .description('Create a file')
    .action((file) => {
      createFile(path.resolve(process.cwd(), file));
    });
}
