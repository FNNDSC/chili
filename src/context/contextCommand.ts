import { Command } from "commander";
import {
  Context,
  chrisContext,
  FullContext,
  URLContext,
  UserContext,
  errorStack,
} from "@fnndsc/cumin";
import chalk from "chalk";
// import Table from "cli-table3";
import { screen, ColumnOptions, displayTable } from "../screen/screen.js";

interface ContextCLIoptions {
  ChRISurl?: string;
  ChRISuser?: string;
  ChRISfolder?: string;
  ChRISfeed?: string;
  ChRISplugin?: string;
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

function context_getFull(options: ContextCLIoptions): string {
  const fullContext: FullContext = chrisContext.getFullContext();
  const currentUser: string = fullContext.currentUser;
  const currentURL: string = fullContext.currentURL;

  Object.entries(fullContext.users).forEach(
    ([user, userContext]: [string, UserContext]) => {
      screen.withBorder(`User: ${user}`, { bottom: false });

      const tableData: any[] = Object.entries(userContext.urls).map(
        ([url, urlContext]: [string, URLContext]): any => ({
          URL: url,
          Folder: urlContext.folder || "Not set",
          Feed: urlContext.feed || "Not set",
          Plugin: urlContext.plugin || "Not set",
          Token: urlContext.token ? "Set" : "Not set",
        })
      );

      // Apply highlighting
      tableData.forEach((row: any) => {
        if (row.URL === currentURL && user === currentUser) {
          Object.keys(row).forEach((key) => {
            row[key] = chalk.cyan(row[key]);
          });
        }
      });
      displayTable(
        tableData,
        ["URL", "Folder", "Feed", "Plugin", "Token"],
        "├"
      );
    }
  );
  return "";
}

function context_getSingle(options: ContextCLIoptions): string {
  chrisContext.currentContext_update();

  if (options.full) {
    const tableData = [
      ["ChRIS URL", chrisContext.singleContext.URL || "Not set"],
      ["ChRIS User", chrisContext.singleContext.user || "Not set"],
      ["ChRIS Folder", chrisContext.singleContext.folder || "Not set"],
      ["ChRIS Feed", chrisContext.singleContext.feed || "Not set"],
      ["ChRIS Plugin", chrisContext.singleContext.plugin || "Not set"],
    ];

    screen.table(tableData, {
      head: ["Context", "Value"],
      columns: [{ color: "yellow", justification: "right" }, { color: "cyan" }],
      // colWidths: [20, 50],
    });

    return ""; // screen.table directly outputs to console, so we return an empty string
  } else {
    const results: string[] = [];

    if (options.ChRISurl) {
      results.push(`ChRIS URL: ${chrisContext.singleContext.URL || "Not set"}`);
    }

    if (options.ChRISuser) {
      results.push(
        `ChRIS User: ${chrisContext.singleContext.user || "Not set"}`
      );
    }

    if (options.ChRISfolder) {
      results.push(
        `ChRIS Folder: ${chrisContext.singleContext.folder || "Not set"}`
      );
    }

    if (options.ChRISfeed) {
      results.push(
        `ChRIS Feed: ${chrisContext.singleContext.feed || "Not set"}`
      );
    }

    if (options.ChRISplugin) {
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
}

function assign_check(context: Context, value: string): string {
  const status: boolean = chrisContext.setCurrent(context, value);
  if (!status) {
    screen.withBorder(
      `${chalk.red(`ERROR: ${errorStack.getAllOfType("error")}`)}`
    );
    return "";
  } else return `${context} set to ${value}`;
}

function context_set(options: ContextCLIoptions): string {
  const results: string[] = [];

  if (options.ChRISuser !== undefined) {
    results.push(assign_check(Context.ChRISuser, options.ChRISuser));
  }

  if (options.ChRISurl !== undefined) {
    results.push(assign_check(Context.ChRISURL, options.ChRISurl));
  }

  if (options.ChRISfolder !== undefined) {
    results.push(assign_check(Context.ChRISfolder, options.ChRISfolder));
  }

  if (options.ChRISfeed !== undefined) {
    results.push(assign_check(Context.ChRISfeed, options.ChRISfeed));
  }

  if (options.ChRISplugin !== undefined) {
    results.push(assign_check(Context.ChRISplugin, options.ChRISplugin));
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
      const result: string = context_get(options);
      // console.log(result);
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
      if (result.length) screen.withBorder(result);
    });
}
