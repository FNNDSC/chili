import { Command } from "commander";
import { chrisContext, Context } from "@fnndsc/cumin";
import chalk from "chalk";
import { files_ls_do, LsOptions, ResourceItem } from '../commands/fs/ls.js';
import { plugin_run_do } from '../commands/plugin/run.js';
import { feed_create_do } from '../commands/feed/create.js';
import { files_mkdir_do } from '../commands/fs/mkdir.js';
import { files_touch_do } from '../commands/fs/touch.js';

function formatItem(item: ResourceItem): string {
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

function getVisibleLength(str: string): number {
  return str.replace(/\u001b\[[0-9;]*m/g, "").length;
}

async function ls(options: LsOptions, pathStr: string = ""): Promise<void> {
  const items: ResourceItem[] = await files_ls_do(options, pathStr); // Call the core logic

  if (items.length === 0) {
      return; 
  }

  const formattedItems = items.map(formatItem);
  
  const termWidth = process.stdout.columns || 80;
  const padding = 2; 
  
  const maxLen = Math.max(...items.map(i => i.name.length));
  const colWidth = maxLen + padding;
  
  const cols = Math.max(1, Math.floor(termWidth / colWidth));
  
  let output = "";
  for (let i = 0; i < formattedItems.length; i++) {
    const item = formattedItems[i];
    const visibleLen = getVisibleLength(item);
    const padLen = colWidth - visibleLen;
    
    output += item + " ".repeat(padLen);
    
    if ((i + 1) % cols === 0) {
      output += "\n";
    }
  }
  
  console.log(output);
}

async function mkdir(dirPath: string): Promise<void> {
  const success = await files_mkdir_do(dirPath); // Use the new doer function
  if (success) {
    console.log(`Created directory: ${dirPath}`);
  } else {
    console.error(`Failed to create directory: ${dirPath}`);
  }
}

async function touch(filePath: string): Promise<void> {
  const success = await files_touch_do(filePath); // Use the new doer function
  if (success) {
    console.log(`Created ${filePath}`);
  } else {
    console.error(`Failed to touch ${filePath}`);
  }
}

async function cd(path?: string): Promise<void> {
  if (!path) {
    await pwd();
    return;
  }
  await chrisContext.current_set(Context.ChRISfolder, path);
  await pwd();
}

async function pwd(): Promise<void> {
  const current = await chrisContext.current_get(Context.ChRISfolder);
  console.log(current || "/");
}

export function setupChefsCommand(program: Command): void {
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