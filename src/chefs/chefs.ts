/**
 * @file ChEFS - ChRIS Experimental File System Shell Primitives.
 *
 * This module provides basic shell-like commands (`ls`, `cd`, `mkdir`, `touch`, `pwd`)
 * that operate on the ChRIS filesystem context.
 *
 * @module
 */
import { Command } from "commander";
import { chrisContext, Context } from "@fnndsc/cumin";
import { files_list, LsOptions } from '../commands/fs/ls.js';
import { ListingItem } from '../models/listing.js';
import { renderGrid, renderLong } from '../views/ls.js';
import { files_mkdir } from '../commands/fs/mkdir.js';
import { files_touch } from '../commands/fs/touch.js';
import { files_upload } from '../commands/fs/upload.js';
import { files_cat } from '../commands/fs/cat.js';
import { renderMkdir, renderTouch, renderUpload, renderCat } from '../views/fs.js';
import { path_resolveChrisFs } from '../utils/cli.js';

/**
 * Lists directory contents.
 *
 * @param options - Listing options.
 * @param pathStr - The path to list.
 */
async function ls(options: LsOptions, pathStr: string = ""): Promise<void> {
  const items: ListingItem[] = await files_list(options, pathStr); // Call the core logic

  if (items.length === 0) {
      return; 
  }

  if (options.long) {
    console.log(renderLong(items, { human: !!options.human }));
  } else {
    console.log(renderGrid(items));
  }
}

/**
 * Creates a directory.
 *
 * @param dirPath - The path of the directory to create.
 */
async function mkdir(dirPath: string): Promise<void> {
  const success: boolean = await files_mkdir(dirPath);
  console.log(renderMkdir(dirPath, success));
}

/**
 * Creates an empty file.
 *
 * @param filePath - The path of the file to create.
 */
async function touch(filePath: string): Promise<void> {
  const success: boolean = await files_touch(filePath);
  console.log(renderTouch(filePath, success));
}

/**
 * Uploads a local file or directory to ChRIS.
 * 
 * @param localPath - Local path.
 * @param remotePath - Remote ChRIS path.
 */
async function upload(localPath: string, remotePath: string): Promise<void> {
  console.log(`Uploading ${localPath} to ${remotePath}...`);
  const success: boolean = await files_upload(localPath, remotePath);
  console.log(renderUpload(localPath, remotePath, success));
}

/**
 * Changes the current working directory.
 *
 * @param path - The path to change to.
 */
async function cd(path?: string): Promise<void> {
  if (!path) {
    await pwd();
    return;
  }
  await chrisContext.current_set(Context.ChRISfolder, path);
  await pwd();
}

/**
 * Prints the current working directory.
 */
async function pwd(): Promise<void> {
  const current: string | null = await chrisContext.current_get(Context.ChRISfolder);
  console.log(current || "/");
}

/**
 * Displays file content.
 *
 * @param filePath - The path of the file to read.
 */
async function cat(filePath: string): Promise<void> {
  const content: string | null = await files_cat(filePath);
  console.log(renderCat(content, filePath));
}

/**
 * Sets up the 'chefs' command group in Commander.
 *
 * @param program - The Commander program instance.
 */
export function chefsCommand_setup(program: Command): void {
  const chefsCommand = program
    .command("chefs")
    .description("Chris Experimental File System - Shell primitives");

  chefsCommand
    .command("ls [path]")
    .description("List filesystem elements (files, dirs, links)")
    .option("-l, --long", "Long listing format")
    .option("-h, --human", "Human readable sizes")
    .action(async (path: string | undefined, options: LsOptions) => {
      await ls(options, path || "");
    });

  chefsCommand
    .command("cat <path>")
    .description("Display file content")
    .action(async (path: string) => {
      await cat(path);
    });

  chefsCommand
    .command("mkdir <path>")
    .description("Create a new folder")
    .action(async (path: string) => {
      await mkdir(path);
    });

  chefsCommand
    .command("touch <path>")
    .description("Create an empty file")
    .action(async (path: string) => {
      await touch(path);
    });

  chefsCommand
    .command("upload <local> <remote>")
    .description("Upload a local file or directory to ChRIS")
    .action(async (local: string, remote: string) => {
      await upload(local, remote);
    });

  chefsCommand
    .command("cd [path]")
    .description("Change current working directory")
    .action(async (path: string | undefined) => {
      await cd(path);
    });

  chefsCommand
    .command("pwd")
    .description("Print working directory")
    .action(async () => {
      await pwd();
    });
}