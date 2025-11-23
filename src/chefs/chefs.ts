import { Command } from "commander";
import { files_getGroup, files_touch, files_mkdir } from "@fnndsc/salsa";
import { ChRISEmbeddedResourceGroup, ListOptions, FilteredResourceData, options_toParams, chrisContext, Context } from "@fnndsc/cumin";
import chalk from "chalk";

interface LsOptions {
  path?: string;
  [key: string]: any;
}

interface ResourceItem {
  name: string;
  type: 'dir' | 'file' | 'link';
}

/**
 * Helper to get resources from a group and push to list.
 */
async function resources_fetch(
  assetName: string,
  path: string,
  items: ResourceItem[]
) {
  const group = await files_getGroup(assetName, path);
  if (group) {
    const params = options_toParams({ limit: 100, offset: 0 });
    
    const results: FilteredResourceData | null = await group.asset.resources_listAndFilterByOptions(params);
    if (results && results.tableData) {
       results.tableData.forEach(item => {
           let name = item.fname || item.path || "";
           if (name.includes('/')) {
               name = name.split('/').pop() || name;
           }
           
           let type: 'dir' | 'file' | 'link' = 'file';
           if (assetName === 'dirs') {
             type = 'dir';
           } else if (assetName === 'links') {
             type = 'link';
           }
           
           items.push({ name, type });
       });
    }
  }
}

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
  const items: ResourceItem[] = [];
  
  await Promise.all([
      resources_fetch('dirs', pathStr, items),
      resources_fetch('files', pathStr, items),
      resources_fetch('links', pathStr, items)
  ]);

  if (items.length === 0) {
      return; 
  }

  items.sort((a, b) => a.name.localeCompare(b.name));

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
  const success = await files_mkdir(dirPath);
  if (success) {
    console.log(`Created directory: ${dirPath}`);
  } else {
    console.error(`Failed to create directory: ${dirPath}`);
  }
}

async function touch(filePath: string): Promise<void> {
  const success = await files_touch(filePath);
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