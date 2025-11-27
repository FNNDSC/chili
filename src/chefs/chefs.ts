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
import chalk from "chalk";
import { files_list, LsOptions, ResourceItem } from '../commands/fs/ls.js';
import { files_mkdir } from '../commands/fs/mkdir.js';
import { files_touch } from '../commands/fs/touch.js';
import { files_content } from '@fnndsc/salsa';
import { path_resolveChrisFs } from '../utils/cli.js';

/**
 * Formats a resource item for display (color coding).
 *
 * @param item - The resource item to format.
 * @returns The formatted name string.
 */
function item_format(item: ResourceItem): string {
  switch (item.type) {
    case 'dir':
      return chalk.blue.bold(item.name);
    case 'link':
      return chalk.cyan(item.name);
    case 'file':
    default:
      return item.name;
  }
}

/**
 * Calculates the visible length of a string, stripping ANSI codes.
 *
 * @param str - The string to measure.
 * @returns The visible length.
 */
function visibleLength_get(str: string): number {
  return str.replace(/\u001b\[[0-9;]*m/g, "").length;
}

/**
 * Lists directory contents.
 *
 * @param options - Listing options.
 * @param pathStr - The path to list.
 */
async function ls(options: LsOptions, pathStr: string = ""): Promise<void> {
  const items: ResourceItem[] = await files_list(options, pathStr); // Call the core logic

  if (items.length === 0) {
      return; 
  }

  const formattedItems = items.map(item_format);
  
  const termWidth = process.stdout.columns || 80;
  const padding = 2; 
  
  const maxLen = Math.max(...items.map(i => i.name.length));
  const colWidth = maxLen + padding;
  
  const cols = Math.max(1, Math.floor(termWidth / colWidth));
  
  let output = "";
  for (let i = 0; i < formattedItems.length; i++) {
    const item = formattedItems[i];
    const visibleLen = visibleLength_get(item);
    const padLen = colWidth - visibleLen;
    
    output += item + " ".repeat(padLen);
    
    if ((i + 1) % cols === 0) {
      output += "\n";
    }
  }
  
  console.log(output);
}

/**
 * Creates a directory.
 *
 * @param dirPath - The path of the directory to create.
 */
async function mkdir(dirPath: string): Promise<void> {
  const success = await files_mkdir(dirPath); // Use the new doer function
  if (success) {
    console.log(`Created directory: ${dirPath}`);
  } else {
    console.error(`Failed to create directory: ${dirPath}`);
  }
}

/**
 * Creates an empty file.
 *
 * @param filePath - The path of the file to create.
 */
async function touch(filePath: string): Promise<void> {
  const success = await files_touch(filePath); // Use the new doer function
  if (success) {
    console.log(`Created ${filePath}`);
  } else {
    console.error(`Failed to touch ${filePath}`);
  }
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
  const current = await chrisContext.current_get(Context.ChRISfolder);
  console.log(current || "/");
}

/**
 * Displays file content.
 *
 * @param filePath - The path of the file to read.
 */
async function cat(filePath: string): Promise<void> {
  const resolved = await path_resolveChrisFs(filePath, {});
  const content = await files_content(resolved);
  if (content !== null) {
    console.log(content);
  } else {
    console.error(`File not found or empty: ${filePath}`);
  }
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
    .action(async (path, options) => {
      await ls(options, path || "");
    });

  chefsCommand
    .command("cat <path>")
    .description("Display file content")
    .action(async (path) => {
      await cat(path);
    });

  chefsCommand
    .command("mkdir <path>")
    .description("Create a new folder")
    .action(async (path) => {
      await mkdir(path);
    });

  chefsCommand
    .command("touch <path>")
    .description("Create an empty file")
    .action(async (path) => {
      await touch(path);
    });

  chefsCommand
    .command("cd [path]")
    .description("Change current working directory")
    .action(async (path) => {
      await cd(path);
    });

  chefsCommand
    .command("pwd")
    .description("Print working directory")
    .action(async () => {
      await pwd();
    });
}