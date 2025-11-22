import { Command } from "commander";
import { BaseGroupHandler } from "../handlers/baseGroupHandler.js";
import { Context, chrisContext } from "@fnndsc/cumin";
import { CLIoptions } from "../utils/cli";
import { PluginMetaController } from "../controllers/pluginMetaController.js";
import chalk from "chalk";
import { marked } from "marked";
import TerminalRenderer from "marked-terminal";

// Configure marked to use the terminal renderer
marked.setOptions({
  renderer: new TerminalRenderer({
    code: chalk.yellow,
    blockquote: chalk.gray.italic,
    html: chalk.gray,
    heading: chalk.green.bold,
    firstHeading: chalk.magenta.underline.bold,
    hr: chalk.reset,
    listitem: chalk.cyan,
    table: chalk.white,
    paragraph: chalk.white,
    strong: chalk.bold,
    em: chalk.italic,
    codespan: chalk.yellow,
    del: chalk.dim.gray.strikethrough,
    link: chalk.cyan,
    href: chalk.blueBright.underline,
  }),
});

/**
 * Handles commands related to groups of plugin metadata.
 */
export class PluginMetaGroupHandler {
  private baseGroupHandler: BaseGroupHandler;
  private controller: PluginMetaController;
  assetName = "pluginMetas";

  constructor() {
    this.controller = PluginMetaController.controller_create();
    this.baseGroupHandler = new BaseGroupHandler(
      this.assetName,
      this.controller.chrisObject
    );
  }

  /**
   * Prints the content of a README file from a given repository URL.
   * Attempts to fetch README.md or README.rst from 'master' or 'main' branches.
   *
   * @param repoUrl - The base URL of the plugin repository.
   */
  async readme_print(repoUrl: string): Promise<void> {
    const content = await this.controller.readmeContent_fetch(repoUrl);
    if (content) {
      console.log(chalk.green.bold("\nREADME Content:"));
      const parsedContent = marked(content);
      console.log(parsedContent);
    } else {
      console.log(chalk.red("README not found in the repository."));
    }
  }

  /**
   * Retrieves and displays the README for a specific plugin.
   *
   * @param pluginId - The ID of the plugin.
   * @returns A Promise resolving to the documentation URL or null.
   */
  async pluginReadme_get(pluginId: string): Promise<string | null> {
    try {
      console.log(`Fetching info for plugin with ID: ${pluginId}`);
      const documentation = await this.controller.documentationUrl_get(pluginId);
      if (!documentation) {
        return null;
      }
      console.log(documentation);
      await this.readme_print(documentation);
      return documentation;
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(`Error fetching plugin info: ${error.message}`);
      } else {
        console.error("An unknown error occurred while fetching plugin info");
      }
    }
    return null;
  }

  /**
   * Retrieves a plugin ID based on search options.
   *
   * @param options - CLI options for searching for a plugin.
   * @returns A Promise resolving to the plugin ID as a string, or null if not found.
   */
  async pluginID_fromSearch(options: CLIoptions): Promise<string | null> {
    const pluginId = await this.controller.pluginID_fromSearch(options);
    // Warning logic could be here if controller returns array, but controller returns single ID or null.
    // Assuming single hit for simplicity based on previous refactor
    return pluginId;
  }

  /**
   * Sets up the Commander.js commands for plugin metadata group operations.
   *
   * @param program - The Commander.js program instance.
   */
  pluginMetaGroupCommand_setup(program: Command): void {
    this.baseGroupHandler.command_setup(program);

    const pluginCommand = program.commands.find(
      (cmd) => cmd.name() === this.assetName
    );

    if (pluginCommand) {
      pluginCommand
        .command("readme [pluginId]")
        .description(
          "Get detailed information about a specific plugin, specified typically by pluginID."
        )
        .option(
          "--search <searchString>",
          "Search for a plugin using a comma-separated key-value pair"
        )
        .action(
          async (
            pluginId: string | undefined,
            options: CLIoptions & { search?: string }
          ) => {
            let targetId: string | null;
            if (pluginId === undefined) {
              if (options.search === undefined) {
                targetId = await chrisContext.current_get(Context.ChRISplugin); // Await and RPN change
              } else {
                targetId = await this.pluginID_fromSearch(options);
              }
            } else {
              targetId = pluginId;
            }
            if (targetId) {
              await this.pluginReadme_get(targetId);
            }
          }
        );
    } else {
      console.error(
        `Failed to find '${this.assetName}' command. The 'info' subcommand was not added.`
      );
    }
  }
}
