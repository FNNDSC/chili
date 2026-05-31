import { Command } from "commander";
import {
  FullContext,
  URLContext,
  UserContext,
  errorStack,
} from "@fnndsc/cumin";
import {
  context_getFull,
  context_getSingle,
  context_set as salsa_context_set,
  ContextOptions
} from "@fnndsc/salsa";
import chalk from "chalk";
// import Table from "cli-table3";
import { screen, border_draw, table_display, TableDataRow } from "../screen/screen.js";

/**
 * Retrieves and formats ChRIS context information based on CLI options.
 *
 * @param options - CLI options for context retrieval.
 * @returns A formatted string of context information.
 */
async function context_get(options: ContextOptions): Promise<string> {
  const results: string[] = [];
  if (options.all) {
    return context_displayFull(options);
  } else {
    return context_displaySingle(options);
  }
}

/**
 * Retrieves and displays the full ChRIS context, including all users and their URLs.
 *
 * @param options - CLI options (currently only `all` is used to trigger this function).
 * @returns An empty string, as output is directly to console via `displayTable`.
 */
function context_displayFull(options: ContextOptions): string {
  const fullContext: FullContext = context_getFull();
  const currentUser: string | null = fullContext.currentUser;
  const currentURL: string | null = fullContext.currentURL;

  interface ContextRow extends TableDataRow {
    URL: string;
    Folder: string;
    Feed: string;
    Plugin: string;
    PACS: string;
    Token: string;
  }

  Object.entries(fullContext.users).forEach(
    ([user, userContext]: [string, UserContext]) => {
      const tableData: ContextRow[] = Object.entries(userContext.urls).map(
        ([url, urlContext]: [string, URLContext]): ContextRow => ({
          URL: url,
          Folder: urlContext.folder || "Not set",
          Feed: urlContext.feed || "Not set",
          Plugin: urlContext.plugin || "Not set",
          PACS: urlContext.pacsserver || "Not set",
          Token: urlContext.token ? "Set" : "Not set",
        })
      );

      // Apply highlighting
      tableData.forEach((row: ContextRow) => {
        if (row.URL === currentURL && user === currentUser) {
          (Object.keys(row) as Array<keyof ContextRow>).forEach((key) => {
            row[key] = chalk.cyan(row[key]);
          });
        }
      });

      table_display(tableData, ["URL", "Folder", "Feed", "Plugin", "PACS", "Token"], {
        title: {
          title: `User: ${user}`,
          justification: "center",
        },
      });
    }
  );
  return "";
}

/**
 * Retrieves and displays a single ChRIS context (current context).
 *
 * @param options - CLI options for context retrieval (e.g., --full, --ChRISurl).
 * @returns A formatted string of context information, or an empty string if output handled by `screen.table_output`.
 */
async function context_displaySingle(options: ContextOptions): Promise<string> {
  const singleContext = await context_getSingle();

  if (options.full) {
    const tableData = [
      {
        Context: "ChRIS URL",
        Value: singleContext.URL || "Not set",
      },
      {
        Context: "ChRIS User",
        Value: singleContext.user || "Not set",
      },
      {
        Context: "ChRIS Folder",
        Value: singleContext.folder || "Not set",
      },
      {
        Context: "ChRIS Feed",
        Value: singleContext.feed || "Not set",
      },
      {
        Context: "ChRIS Plugin",
        Value: singleContext.plugin || "Not set",
      },
      {
        Context: "PACS Server",
        Value: singleContext.pacsserver || "Not set",
      },
    ];

    console.log(
      screen.table_output(tableData, {
        head: ["Context", "Value"],
        columns: [
          { color: "yellow", justification: "right" },
          { color: "cyan", justification: "left" },
        ],
        title: {
          title: "ChRIS Context",
          justification: "center",
        },
      })
    );

    return ""; // screen.table directly outputs to console, so we return an empty string
  } else {
    const results: string[] = [];

    if (options.ChRISurl) {
      results.push(`ChRIS URL: ${singleContext.URL || "Not set"}`);
    }

    if (options.ChRISuser) {
      results.push(
        `ChRIS User: ${singleContext.user || "Not set"}`
      );
    }

    if (options.ChRISfolder) {
      results.push(
        `ChRIS Folder: ${singleContext.folder || "Not set"}`
      );
    }

    if (options.ChRISfeed) {
      results.push(
        `ChRIS Feed: ${singleContext.feed || "Not set"}`
      );
    }

    if (options.ChRISplugin) {
      results.push(
        `ChRIS Plugin: ${singleContext.plugin || "Not set"}`
      );
    }

    if (options.pacsserver) {
      results.push(`PACS Server: ${singleContext.pacsserver || "Not set"}`);
    }

    if (results.length === 0) {
      results.push(
        "No specific context requested. Use --ChRISurl, --ChRISuser, --ChRISfolder, --ChRISfeed, --pacsserver, or --full"
      );
    }

    return results.join("\n");
  }
}

/**
 * Sets various ChRIS context parameters based on CLI options.
 *
 * @param options - CLI options for setting context.
 * @returns A formatted string summarizing the context changes.
 */
async function context_set(options: ContextOptions): Promise<string> {
  const result = await salsa_context_set(options);
  if (!result.ok) {
    const errors = errorStack.allOfType_get('error');
    border_draw(chalk.red(`ERROR: ${errors.join('\n')}`));
    return "";
  }
  if (result.value.length === 0) {
    return "No context value was set. Use --ChRISurl, --ChRISuser, --ChRISFolder, --ChRISfeed, or --ChRISPlugin";
  }
  return result.value.join("\n");
}

/**
 * Sets up the 'context' command for the CLI program, allowing users to
 * get and set various ChRIS context parameters.
 *
 * @param program - The Commander.js program instance.
 */
export async function contextCommand_setup(program: Command): Promise<void> {
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
    .option("--pacsserver", "get the current PACS server context")
    .option("--full", "get full current context")
    .option("--all", "get all contexts for current session")
    .action(async (options) => {
      const result: string = await context_get(options);
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
    .option("--pacsserver <pacsserver>", "set the current PACS server context")
    .action(async (options) => {
      const result = await context_set(options);
      if (result.length) border_draw(result);
    });
}
