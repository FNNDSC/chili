import { Command } from "commander";
// import { chrisConnection } from "../connect/chrisConnection.js";
import { chrisConnection } from "@fnndsc/cumin";
//import Client from "@fnndsc/chrisapi";

import * as fs from "fs";
import * as path from "path";

interface LsOptions {
  page?: string;
  fields?: string;
  [key: string]: any; // This allows for any additional options
}

interface MkdirOptions {
  page?: string;
  fields?: string;
  [key: string]: any; // This allows for any additional options
}

async function ls(options: LsOptions): Promise<void> {
  console.log("in ls");
}

async function mkdir(dirPath: string): Promise<void> {
  console.log("in mkdir");
}

function touch(filePath: string): void {
  console.log("in touch");
}

export function setupCHFSCommand(program: Command): void {
  const chfsCommand = program
    .command("chfs")
    .description("Interact with the ChRIS filesystem");

  chfsCommand
    .command("ls")
    .description("List filesystem elements")
    .option("-p, --page <size>", "Page size (default 20)")
    .option(
      "-f, --fields <fields>",
      "Comma-separated list of fields to display",
    )
    .action(async (options) => {
      await ls(options);
    });

  chfsCommand
    .command("mkdir")
    .description("Create a new folder")
    .action(async (options) => {
      await mkdir(options);
    });
}
