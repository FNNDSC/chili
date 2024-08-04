import { Command } from "commander";
import { BaseGroupHandler } from "../handlers/baseGroupHandler.js";
import {
  ChRISPluginMetaPluginGroup,
  QueryHits,
  ChRISPlugin,
} from "@fnndsc/cumin";
import { CLIoptions } from "../utils/cli";
import axios from "axios";
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

export class PluginMetaGroupHandler {
  private baseGroupHandler: BaseGroupHandler;
  private chrisPlugin: ChRISPlugin;
  assetName = "pluginMetas";

  constructor() {
    const chrisPluginMetaGroup = new ChRISPluginMetaPluginGroup();
    this.chrisPlugin = new ChRISPlugin();
    this.baseGroupHandler = new BaseGroupHandler(
      this.assetName,
      chrisPluginMetaGroup
    );
  }

  async printReadme(repoUrl: string): Promise<void> {
    const readmeUrls = [
      `${repoUrl}/raw/master/README.md`,
      `${repoUrl}/raw/master/README.rst`,
      `${repoUrl}/raw/main/README.md`,
      `${repoUrl}/raw/main/README.rst`,
    ];

    for (const url of readmeUrls) {
      try {
        const response = await axios.get(url);
        if (response.status === 200) {
          console.log(chalk.green.bold("\nREADME Content:"));
          const parsedContent = marked(response.data);
          console.log(parsedContent);
          return;
        }
      } catch (error) {
        // If we get here, the current URL didn't work. We'll try the next one.
      }
    }
    console.log(chalk.red("README not found in the repository."));
  }

  async getPluginReadme(pluginId: string): Promise<string | null> {
    try {
      console.log(`Fetching info for plugin with ID: ${pluginId}`);
      const query: QueryHits | null =
        await this.chrisPlugin.pluginData_getFromSearch(
          { search: "id: " + pluginId },
          "documentation"
        );
      if (!query) {
        return null;
      }
      const documentation = query.hits[0];
      console.log(documentation);
      if (documentation) {
        await this.printReadme(documentation);
      }
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

  async pluginID_getFromSearch(options: CLIoptions): Promise<string | null> {
    const queryHits: QueryHits | null =
      await this.chrisPlugin.pluginData_getFromSearch(options, "id");
    if (queryHits) {
      if (queryHits.length > 1) {
        console.log(
          "Warning: the search spec returned multiple hits -- only the first hit will be used."
        );
      }
      return queryHits.hits[0];
    } else {
      return null;
    }
  }

  setupCommand(program: Command): void {
    this.baseGroupHandler.setupCommand(program);

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
              targetId = await this.pluginID_getFromSearch(options);
            } else {
              targetId = pluginId;
            }
            if (targetId) {
              await this.getPluginReadme(targetId);
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
