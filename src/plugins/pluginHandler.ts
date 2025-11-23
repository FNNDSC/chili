import { Command } from "commander";
import { BaseGroupHandler } from "../handlers/baseGroupHandler.js";
import { CLIoptions } from "../utils/cli";
import { screen, table_display } from "../screen/screen.js";
import { PluginController } from "../controllers/pluginController.js";
import { Dictionary, errorStack } from "@fnndsc/cumin";
import { plugin_register } from "@fnndsc/salsa";
import path from "path";
import { exec } from "child_process";

/**
 * Promisified version of child_process.exec.
 * @param command - The command string to execute.
 * @returns A Promise that resolves with { stdout, stderr }.
 */
async function execPromise(command: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

/**
 * Executes a shell command and returns its stdout.
 * @param command - The command to execute.
 * @returns The stdout of the command, or null if an error occurred.
 */
async function run_command_get_stdout(command: string): Promise<string | null> {
  try {
    const { stdout, stderr } = await execPromise(command);
    if (stderr) {
      // console.warn(`Command stderr: ${stderr.trim()}`); // Log stderr as warning, not necessarily an error
    }
    return stdout.trim();
  } catch (error: any) {
    // console.error(`Command failed: ${command}`);
    // console.error(`Error: ${error.message}`);
    return null;
  }
}

/**
 * Checks if Docker is installed and running.
 * @returns True if Docker is available, false otherwise.
 */
async function check_docker_availability(): Promise<boolean> {
  // Use a simple docker command to check availability
  const result = await run_command_get_stdout("docker info > /dev/null 2>&1 && echo OK");
  if (result === "OK") {
    return true;
  }
  console.error("Error: Docker is not installed or not running.");
  console.error("Please ensure Docker is properly set up on your system to add plugins.");
  return false;
}

/**
 * Handles commands related to groups of ChRIS plugins.
 */
export class PluginGroupHandler {
  private baseGroupHandler: BaseGroupHandler;
  private controller: PluginController;
  assetName = "plugins";

  constructor() {
    this.controller = PluginController.controller_create();
    this.baseGroupHandler = new BaseGroupHandler(
      this.assetName,
      this.controller.chrisObject
    );
  }

  async plugins_overview(): Promise<void> {
    await this.controller.plugins_overview();
  }

  /**
   * Adds a new plugin to ChRIS.
   * @param image - The Docker image of the plugin.
   * @param options - CLI options including public_repo and compute environments.
   */
  async plugins_add(image: string, options: CLIoptions): Promise<void> {
    if (!await check_docker_availability()) {
      return;
    }

    console.log(`Attempting to add plugin from image: ${image}`);

    // 1. Docker Pull
    console.log(`Pulling Docker image: ${image}...`);
    // Suppress verbose output of docker pull for cleaner CLI
    const pullResult = await run_command_get_stdout(`docker pull ${image} --quiet`); 
    if (pullResult === null) {
      console.error(`Failed to pull Docker image: ${image}`);
      return;
    }
    console.log(`Successfully pulled ${image}`);

    // 2. Docker Run to get JSON descriptor
    console.log("Extracting plugin descriptor from image...");
    let pluginJsonString: string | null = null;
    const commandChrisPluginInfo = `docker run --rm ${image} chris_plugin_info`;
    const commandOldChrisApp = `docker run --rm ${image} --json`;

    // Try chris_plugin_info first
    pluginJsonString = await run_command_get_stdout(commandChrisPluginInfo);

    if (pluginJsonString === null || pluginJsonString.trim() === "") {
      // If chris_plugin_info failed or returned empty, try --json
      console.log("chris_plugin_info failed or returned empty, trying --json...");
      pluginJsonString = await run_command_get_stdout(commandOldChrisApp);
    }

    if (pluginJsonString === null || pluginJsonString.trim() === "") {
      console.error("Failed to extract plugin descriptor JSON from the image.");
      console.error("Ensure the plugin image supports 'chris_plugin_info' or '--json' output.");
      return;
    }

    let pluginData: any;
    try {
      pluginData = JSON.parse(pluginJsonString);
    } catch (e) {
      console.error("Failed to parse plugin descriptor JSON.");
      console.error(pluginJsonString);
      return;
    }

    // 3. Infer missing fields (if any)
    if (!pluginData.name) {
      // Extract name from image, e.g., 'fnndsc/pl-dcm2niix:1.0.0' -> 'pl-dcm2niix'
      const imageNameWithoutTag = image.split(':')[0];
      pluginData.name = path.basename(imageNameWithoutTag);
      console.log(`Inferred plugin name: ${pluginData.name}`);
    }
    if (!pluginData.dock_image) {
      pluginData.dock_image = image;
      console.log(`Inferred dock_image: ${pluginData.dock_image}`);
    }
    if (!pluginData.public_repo && options.public_repo) {
        pluginData.public_repo = options.public_repo;
        console.log(`Using provided public_repo: ${pluginData.public_repo}`);
    } else if (!pluginData.public_repo && image.includes('/')) {
        // Basic inference for repo from image name if not explicitly provided
        const repoGuess = image.split('/')[0] + '/' + path.basename(image.split(':')[0]);
        pluginData.public_repo = `https://github.com/${repoGuess}`;
        console.log(`Inferred public_repo: ${pluginData.public_repo}`);
    }
    

    // 4. Register with Salsa
    console.log("Registering plugin with ChRIS CUBE...");
    const computeResources = options.compute ? options.compute.split(',') : [];
    const registeredPlugin = await plugin_register(pluginData, computeResources);

    if (registeredPlugin) {
      console.log(`Plugin '${registeredPlugin.name}' (ID: ${registeredPlugin.id}) added successfully.`);
    } else {
      console.error("Failed to add plugin to ChRIS CUBE.");
    }
  }

  /**
   * Sets up the Commander.js commands for plugin group operations.
   *
   * @param program - The Commander.js program instance.
   */
  pluginGroupCommand_setup(program: Command): void {
    this.baseGroupHandler.command_setup(program);

    const pluginsCommand = program.commands.find(
      (cmd) => cmd.name() === this.assetName
    );

    if (pluginsCommand) {
      pluginsCommand
        .command("overview")
        .description("Get an overview of various plugin-group operations")
        .action(async (pluginId: string, options: CLIoptions) => {
          await this.plugins_overview();
        });

      pluginsCommand
        .command("add <image>")
        .description("Add a new plugin to ChRIS from a Docker image")
        .option(
          "-r, --public_repo <url>",
          "Public repository URL of the plugin (e.g., https://github.com/FNNDSC/pl-dcm2niix)"
        )
        .option(
          "-c, --compute <names>",
          "Comma-separated list of compute resource names to assign the plugin to"
        )
        .action(async (image: string, options: CLIoptions) => {
          await this.plugins_add(image, options);
        });

    } else {
      console.error(`Failed to find '${this.assetName}' command.`);
    }
  }
}

/**
 * Handles commands related to individual ChRIS plugins.
 */
export class PluginMemberHandler {
  private assetName: string;
  private controller: PluginController;

  constructor() {
    this.assetName = "plugin";
    this.controller = PluginController.controller_create();
  }

  async plugin_infoGet(pluginId: string): Promise<void> {
    try {
      console.log(`Fetching info for plugin with ID: ${pluginId}`);
      await this.controller.plugin_infoGet(pluginId);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(`Error fetching plugin info: ${error.message}`);
      } else {
        console.error("An unknown error occurred while fetching plugin info");
      }
    }
  }

  async plugin_run(searchable: string, params: string): Promise<Number | null> {
    const instance: Dictionary | null = await this.controller.plugin_run(
      searchable,
      params
    );
    if (!instance) {
      console.log(errorStack.messagesOfType_search("error", "plugin"));
      return null;
    }

    table_display(Object.entries(instance), ["Plugin Parameter", "Value"]);
    return instance.id as number;
  }

  async plugin_searchableToIDs(searchable: string): Promise<string[] | null> {
    const hits = await this.controller.plugin_searchableToIDs(searchable);
    if (!hits) {
      return null;
    }
    console.log(hits);
    return hits;
  }

  /**
   * Sets up the Commander.js commands for individual plugin operations.
   *
   * @param program - The Commander.js program instance.
   */
  pluginCommand_setup(program: Command): void {
    const pluginCommand = program
      .command(this.assetName)
      .description(`Interact with a single ChRIS ${this.assetName}`);

    if (pluginCommand) {
      pluginCommand
        .command("readme <pluginId>")
        .description("Get the readme of a specific plugin")
        .action(async (pluginId: string, options: CLIoptions) => {
          await this.plugin_infoGet(pluginId);
        });

      pluginCommand
        .command("run <searchable...>")
        .description("Run a plugin in a given context")
        .allowUnknownOption(true)
        .action(async (args: string[], command: Command) => {
          const searchable: string = args[0];
          let pluginParams: string = "";
          if (args.length > 0) {
            pluginParams = args.slice(1).join("' '");
          }
          pluginParams = `'${pluginParams}'`;
          await this.plugin_run(searchable, pluginParams);
        });

      pluginCommand
        .command("search <searchable>")
        .description("Resolve a plugin searchable into an ID")
        .action((searchable) => {
          this.plugin_searchableToIDs(searchable);
        });
    } else {
      console.error(
        `Failed to find '${this.assetName}' command. The 'readme' subcommand was not added.`
      );
    }
  }
}
