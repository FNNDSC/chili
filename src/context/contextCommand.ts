import { Command } from "commander";
import {
  Context,
  chrisContext,
  FullContext,
  URLContext,
  UserContext,
} from "@fnndsc/cumin";
import chalk from "chalk";
import Table from "cli-table3";

interface ContextCLIoptions {
  ChRISurl?: boolean;
  ChRISuser?: boolean;
  ChRISfolder?: boolean;
  ChRISfeed?: boolean;
  ChRISplugin?: boolean;
  full?: boolean;
  all?: boolean;
}

function context_get(options: ContextCLIoptions): string {
  const results: string[] = [];
  if (options.all) {
    return context_getFull(options);
  } else {
    return context_getSingle(options);
  }
}

function context_getFull(options): string {
  const fullContext: FullContext = chrisContext.getFullContext();
  let output = "";

  const currentUser: string = fullContext.currentUser;
  const currentURL: string = fullContext.currentURL;
  output += `Current User: ${currentUser || "Not set"}\n`;
  output += `Current URL:  ${currentURL || "Not set"}\n\n`;

  Object.entries(fullContext.users).forEach(
    ([user, userContext]: [string, UserContext]) => {
      const userTable = new Table({
        head: [
          chalk.yellow("URL"),
          chalk.yellow("Folder"),
          chalk.yellow("Feed"),
          chalk.yellow("Plugin"),
          chalk.yellow("Token"),
        ],
        colWidths: [60, 60, 20, 20, 20],
      });

      Object.entries(userContext.urls).forEach(
        ([url, urlContext]: [string, URLContext]) => {
          const isCurrentURL = url === currentURL;
          const isCurrentUser = user === currentUser;
          let urlString = url;
          let row = [
            urlString,
            urlContext.folder || "Not set",
            urlContext.feed || "Not set",
            urlContext.plugin || "Not set",
            urlContext.token ? "Set" : "Not set",
          ];

          if (isCurrentURL && isCurrentUser) {
            row = row.map((cell) => chalk.cyan(cell));
            row[0] = chalk.cyan(`${url}`);
          }

          userTable.push(row);
        }
      );

      output += `User: ${user}\n`;
      output += `Current URL: ${userContext.currentURL || "Not set"}\n`;
      output += userTable.toString() + "\n\n";
    }
  );
  return output;
}

function context_getSingle(options: ContextCLIoptions): string {
  const results: string[] = [];
  chrisContext.currentContext_update();

  if (options.ChRISurl || options.full) {
    results.push(`ChRIS URL: ${chrisContext.singleContext.URL || "Not set"}`);
  }

  if (options.ChRISuser || options.full) {
    results.push(`ChRIS User: ${chrisContext.singleContext.user || "Not set"}`);
  }

  if (options.ChRISfolder || options.full) {
    results.push(
      `ChRIS Folder: ${chrisContext.singleContext.folder || "Not set"}`
    );
  }

  if (options.ChRISfeed || options.full) {
    results.push(`ChRIS Feed: ${chrisContext.singleContext.feed || "Not set"}`);
  }

  if (options.ChRISplugin || options.full) {
    results.push(
      `ChRIS Plugin: ${chrisContext.singleContext.plugin || "Not set"}`
    );
  }

  if (results.length === 0) {
    results.push(
      "No specific context requested. Use --ChRISurl, --ChRISuser, --ChRISfolder, --ChRISfeed, or --full"
    );
  }

  return results.join("\n");
}

function context_set(options: ContextCLIoptions): string {
  const results: string[] = [];

  if (options.ChRISuser !== undefined) {
    chrisContext.setCurrent(Context.ChRISuser, options.ChRISuser);
    results.push(`ChRIS User set to: ${options.ChRISuser}`);
  }

  if (options.ChRISurl !== undefined) {
    chrisContext.setCurrent(Context.ChRISURL, options.ChRISurl);
    results.push(`ChRIS URL set to: ${options.ChRISurl}`);
  }

  if (options.ChRISfolder !== undefined) {
    chrisContext.setCurrent(Context.ChRISfolder, options.ChRISfolder);
    results.push(`ChRIS Folder set to: ${options.ChRISfolder}`);
  }

  if (options.ChRISfeed !== undefined) {
    chrisContext.setCurrent(Context.ChRISfeed, options.ChRISfeed);
    results.push(`ChRIS Feed set to: ${options.ChRISfeed}`);
  }

  if (options.ChRISplugin !== undefined) {
    chrisContext.setCurrent(Context.ChRISplugin, options.ChRISplugin);
    results.push(`ChRIS Plugin set to: ${options.ChRISplugin}`);
  }

  if (results.length === 0) {
    results.push(
      "No context value was set. Use --ChRISurl, --ChRISuser, --ChRISFolder, --ChRISfeed, or --ChRISPlugin"
    );
  }

  return results.join("\n");
}

export async function setupContextCommand(program: Command): Promise<void> {
  const contextCommand = program
    .command("context")
    .description("Manipulate the ChRIS context");

  contextCommand
    .command("get")
    .description("get information about the current context")
    .option("--ChRISurl", "get the ChRIS URL for this context")
    .option("--ChRISuser", "get the ChRIS user for this context")
    .option("--ChRISfolder", "get the current ChRIS Folder context")
    .option("--ChRISfeed", "get the current ChRIS Feed context")
    .option(
      "--ChRISplugin",
      "get the current ChRIS Plugin (or instance) context"
    )
    .option("--full", "get full current context")
    .option("--all", "get all contexts for current session")
    .action((options) => {
      const result = context_get(options);
      console.log(result);
    });

  contextCommand
    .command("set")
    .description("set values for the ChRIS context")
    .option("--ChRISurl <url>", "set the ChRIS URL for this context")
    .option("--ChRISuser <user>", "set the ChRIS user for this context")
    .option("--ChRISfolder <folder>", "set the current ChRIS Folder context")
    .option("--ChRISfeed <feedID>", "set the current ChRIS Feed context")
    .option(
      "--ChRISplugin <pluginID>",
      "set the current ChRIS Plugin (or instance) context"
    )
    .action((options) => {
      const result = context_set(options);
      console.log(result);
    });
}
