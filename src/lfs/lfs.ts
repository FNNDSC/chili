/**
 * @file Local File System (LFS) Operations.
 *
 * This module provides command implementations for interacting with the
 * local filesystem, mirroring standard shell commands like ls, mkdir, touch.
 *
 * @module
 */
import * as fs from 'fs';
import * as path from 'path';
import { Command } from 'commander';

/**
 * Lists the contents of a directory with details.
 *
 * @param filepath - The directory path to list.
 */
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

/**
 * Creates a directory if it does not exist.
 *
 * @param filepath - The directory path to create.
 */
export function dir_create(filepath: string) {
  if (!fs.existsSync(filepath)) {
    fs.mkdirSync(filepath);
    console.log("The directory has been created successfully");
  }
}

/**
 * Creates an empty file.
 *
 * @param filepath - The file path to create.
 */
export function file_create(filepath: string) {
  fs.openSync(filepath, "w");
  console.log("An empty file has been created");
}

/**
 * Sets up the 'lfs' command group in Commander.
 *
 * @param program - The Commander program instance.
 */
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
