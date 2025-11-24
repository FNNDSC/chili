import { CLIoptions } from "../../utils/cli.js";
import { check_docker_availability, run_command_get_stdout } from "../../utils/docker.js";
import { plugin_register } from "@fnndsc/salsa";
import path from "path";

/**
 * Describes the shape of the JSON object returned by a ChRIS plugin's
 * `chris_plugin_info` or `--json` entrypoint.
 */
interface PluginInfo {
  name: string;
  dock_image: string;
  public_repo: string;
  [key: string]: any; // Allow other properties
}

/**
 * Orchestrates the addition of a new plugin: pulls Docker image, extracts metadata, and registers with ChRIS.
 *
 * @param image - The Docker image of the plugin.
 * @param options - CLI options including public_repo and compute environments.
 * @returns A Promise resolving to true on success, false on failure.
 */
export async function plugins_add_do(image: string, options: CLIoptions): Promise<boolean> {
  if (!await check_docker_availability()) {
    return false;
  }

  console.log(`Attempting to add plugin from image: ${image}`);

  // 1. Docker Pull
  console.log(`Pulling Docker image: ${image}...`);
  // Suppress verbose output of docker pull for cleaner CLI
  const pullResult: string | null = await run_command_get_stdout(`docker pull ${image} --quiet`);
  if (pullResult === null) {
    console.error(`Failed to pull Docker image: ${image}`);
    return false;
  }
  console.log(`Successfully pulled ${image}`);

  // 2. Docker Run to get JSON descriptor
  console.log("Extracting plugin descriptor from image...");
  let pluginJsonString: string | null = null;
  const commandChrisPluginInfo: string = `docker run --rm ${image} chris_plugin_info`;
  const commandOldChrisApp: string = `docker run --rm ${image} --json`;

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
    return false;
  }

  let pluginData: PluginInfo;
  try {
    pluginData = JSON.parse(pluginJsonString);
  } catch (e) {
    console.error("Failed to parse plugin descriptor JSON.");
    console.error(pluginJsonString);
    return false;
  }

  // 3. Infer missing fields (if any)
  if (!pluginData.name) {
    // Extract name from image, e.g., 'fnndsc/pl-dcm2niix:1.0.0' -> 'pl-dcm2niix'
    const imageNameWithoutTag: string = image.split(':')[0];
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
      const repoGuess: string = image.split('/')[0] + '/' + path.basename(image.split(':')[0]);
      pluginData.public_repo = `https://github.com/${repoGuess}`;
      console.log(`Inferred public_repo: ${pluginData.public_repo}`);
  }

  // 4. Register with Salsa
  console.log("Registering plugin with ChRIS CUBE...");
  const computeResources: string[] = options.compute ? options.compute.split(',') : [];
  const registeredPlugin = await plugin_register(pluginData, computeResources);

  if (registeredPlugin) {
    console.log(`Plugin '${registeredPlugin.name}' (ID: ${registeredPlugin.id}) added successfully.`);
    return true;
  } else {
    console.error("Failed to add plugin to ChRIS CUBE.");
    return false;
  }
}
