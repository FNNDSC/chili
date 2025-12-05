/**
 * @file Implements the logic for adding (registering) new ChRIS plugins.
 *
 * This module orchestrates a three-phase plugin registration strategy:
 * 1. Check if plugin exists in current CUBE → assign to compute resources
 * 2. Search peer stores → import from store if found
 * 3. Docker extraction → pull image, extract JSON, register
 *
 * @module
 */

import { CLIoptions } from '../../utils/cli.js';
import {
  docker_checkAvailability,
  shellCommand_run,
  shellCommand_runWithDetails,
  docker_pullImage,
  docker_getImageCmd,
} from '../../utils/docker.js';
import {
  plugin_registerWithAdmin,
  plugin_checkExists,
  plugin_assignToComputeResources,
  plugins_searchPeers,
  plugin_importFromStore,
  PluginRegistrationData, // Import this interface
} from '@fnndsc/salsa';
import {
  computeResources_validate,
  computeResourceNames_parse,
  errorStack,
} from '@fnndsc/cumin';
import path from 'path';
import {
  input_detectFormat,
  PluginInputFormat,
  DetectedFormat,
} from '../../utils/input_format.js';
import {
  adminCredentials_prompt,
  AdminCredentials,
} from '../../utils/admin_prompt.js';

/**
 * Describes the shape of the JSON object returned by a ChRIS plugin's
 * `chris_plugin_info` or `--json` entrypoint.
 */
interface PluginInfo {
  name: string;
  dock_image: string;
  public_repo?: string;
  [key: string]: unknown;
}

/**
 * Options specific to plugin add command.
 */
interface PluginAddOptions extends CLIoptions {
  compute?: string;
  store?: string;
  adminUser?: string;
  adminPassword?: string;
  public_repo?: string;
}

/**
 * Orchestrates the addition of a new plugin using a three-phase strategy.
 *
 * Phase 1: Check if plugin exists in current CUBE
 * Phase 2: Search peer stores and import if found
 * Phase 3: Docker extraction and registration
 *
 * @param input - Plugin input (name, Docker image, or store URL).
 * @param options - CLI options including compute resources, store URL, and admin credentials.
 * @returns A Promise resolving to `true` on successful registration, `false` otherwise.
 */
export async function plugin_add(
  input: string,
  options: PluginAddOptions
): Promise<boolean> {
  // Detect input format
  const detected: DetectedFormat = input_detectFormat(input);
  console.log(`Detected input format: ${detected.format}`);

  // Parse and validate compute resources
  const computeResources: string[] = options.compute
    ? computeResourceNames_parse(options.compute)
    : ['host'];

  const validationResult = await computeResources_validate(computeResources);
  if (!validationResult.ok) {
    const errors = errorStack.allOfType_get('error');
    errors.forEach((err: string) => console.error(err));
    return false;
  }

  // Phase 1: Check if plugin exists in current CUBE
  console.log('\n=== Phase 1: Checking current CUBE ===');
  const searchTerm: string = detected.format === PluginInputFormat.DOCKER_IMAGE
    ? detected.pluginName || detected.value
    : detected.value;

  const existingPlugin = await plugin_checkExists(searchTerm);
  if (existingPlugin) {
    console.log(`Plugin '${existingPlugin.name}' already exists in CUBE.`);

    if (existingPlugin.id) {
      const assigned = await plugin_assignToComputeResources(
        existingPlugin.id,
        computeResources
      );
      if (assigned) {
        console.log(`Plugin assigned to compute resources: ${computeResources.join(', ')}`);
        return true;
      }
    }

    // Even if assignment failed, plugin exists
    console.log('Plugin already registered.');
    return true;
  }

  console.log('Plugin not found in current CUBE.');

  // Phase 2: Search peer stores (skip if input is store URL)
  if (detected.format !== PluginInputFormat.STORE_URL) {
    console.log('\n=== Phase 2: Searching peer stores ===');
    const peerStoreUrls: string[] = options.store
      ? [options.store]
      : ['https://cube.chrisproject.org/api/v1/'];

    const searchName: string = detected.format === PluginInputFormat.DOCKER_IMAGE
      ? detected.pluginName! // Should be present for docker images
      : detected.value;
    
    const searchVersion: string | undefined = detected.format === PluginInputFormat.DOCKER_IMAGE
      ? detected.version
      : undefined;

    const peerResult = await plugins_searchPeers(searchName, searchVersion, peerStoreUrls);
    if (peerResult) {
      console.log(`Found plugin in peer store: ${peerResult.storeName}`);
      return await pluginFromStore_register(
        peerResult.plugin,
        computeResources,
        options
      );
    }

    console.log('Plugin not found in peer stores.');
  }

  // Phase 3: Docker extraction (only for Docker images or plugin names)
  if (detected.format !== PluginInputFormat.STORE_URL) {
    console.log('\n=== Phase 3: Docker extraction ===');
    const dockerImage: string = detected.format === PluginInputFormat.DOCKER_IMAGE
      ? detected.value
      : `${detected.value}:latest`;  // Assume latest tag for plugin names

    return await pluginFromDocker_register(dockerImage, computeResources, options);
  }

  // If we get here with a store URL, we couldn't process it
  console.error('Store URL import not yet fully supported.');
  return false;
}

/**
 * Registers a plugin from peer store data.
 *
 * Handles admin authentication with retry logic (up to 3 attempts).
 *
 * @param pluginData - Plugin data from peer store.
 * @param computeResources - Compute resources to assign plugin to.
 * @param options - CLI options including admin credentials.
 * @returns Promise resolving to success boolean.
 */
async function pluginFromStore_register(
  pluginData: Record<string, unknown>,
  computeResources: string[],
  options: PluginAddOptions
): Promise<boolean> {
  console.log('Importing plugin from peer store...');

  const initialCreds: AdminCredentials | undefined = 
    options.adminUser && options.adminPassword 
      ? { username: options.adminUser, password: options.adminPassword } 
      : undefined;

  // Try with provided credentials (or current user)
  const result = await plugin_importFromStore(
    '', // Store URL not needed when we have plugin data
    pluginData,
    computeResources,
    initialCreds
  );

  if (result.success) {
    console.log(`Plugin '${result.plugin?.name}' registered successfully.`);
    return true;
  }

  if (!result.requiresAuth) {
    console.error(result.errorMessage || 'Failed to import plugin from store.');
    return false;
  }

  // Admin auth required - try with interactive credentials
  const retrySuccess = await registrationWithAuth_retry(
    async (creds: AdminCredentials) => {
      const retryResult = await plugin_importFromStore('', pluginData, computeResources, creds);
      return retryResult.success;
    },
    options
  );

  if (!retrySuccess) {
    console.error('Failed to import plugin from store (authentication failed or rejected).');
    const errors = errorStack.allOfType_get('error');
    if (errors.length > 0) {
      console.error('Errors:');
      errors.forEach((e: string) => console.error(`- ${e}`));
    }
    
    const warnings = errorStack.allOfType_get('warning');
    if (warnings.length > 0) {
      console.error('Warnings:');
      warnings.forEach((e: string) => console.error(`- ${e}`));
    }
  }

  return retrySuccess;
}

/**
 * Registers a plugin from Docker image.
 *
 * Pulls image (or uses local), extracts JSON descriptor, and registers with admin API.
 *
 * @param image - Docker image name/tag.
 * @param computeResources - Compute resources to assign plugin to.
 * @param options - CLI options including admin credentials.
 * @returns Promise resolving to success boolean.
 */
async function pluginFromDocker_register(
  image: string,
  computeResources: string[],
  options: PluginAddOptions
): Promise<boolean> {
  if (!await docker_checkAvailability()) {
    return false;
  }

  // Pull Docker image (checks local first)
  const pulled = await docker_pullImage(image);
  if (!pulled) {
    return false;
  }

  // Extract plugin descriptor
  console.log('Extracting plugin descriptor from image...');
  const pluginData = await pluginJSON_extractFromImage(image, options);
  if (!pluginData) {
    const msg = 'Failed to extract plugin descriptor from image.';
    console.error(msg);
    errorStack.stack_push('error', msg, 'pluginFromDocker_register');
    return false;
  }

  // Infer missing fields
  pluginData_inferMissingFields(pluginData, image, options);

  const initialCreds: AdminCredentials | undefined = 
    options.adminUser && options.adminPassword 
      ? { username: options.adminUser, password: options.adminPassword } 
      : undefined;

  // Register with admin API
  console.log('Registering plugin with ChRIS CUBE...');
  const registered = await plugin_registerWithAdmin(
    pluginData as unknown as PluginRegistrationData, 
    computeResources,
    initialCreds
  );

  if (registered) {
    console.log(`Plugin '${registered.name}' registered successfully.`);
    return true;
  }

  // Check if failure was due to admin auth
  const errors = errorStack.allOfType_get('error');
  const authError = errors.some((e: string) => {
    const lowerE = e.toLowerCase();
    return lowerE.includes('unauthorized') ||
           lowerE.includes('forbidden') ||
           lowerE.includes('permission denied') ||
           lowerE.includes('401') ||
           lowerE.includes('403') ||
           lowerE.includes('admin credentials required');
  });

  if (!authError) {
    console.error('Failed to register plugin.');
    return false;
  }

  // Retry with admin credentials
  return await registrationWithAuth_retry(
    async (creds: AdminCredentials) => {
      const retryResult = await plugin_registerWithAdmin(
          pluginData as unknown as PluginRegistrationData, 
          computeResources, 
          creds
      );
      return retryResult !== null;
    },
    options
  );
}

/**
 * Extracts plugin JSON descriptor from a Docker image.
 *
 * Tries three methods in order (matching chrisomatic behavior):
 * 1. chris_plugin_info with arguments (post 0.3.0)
 * 2. chris_plugin_info without arguments (pre 0.3.0)
 * 3. <CMD> --json where CMD is extracted from image (old chrisapp)
 *
 * @param image - Docker image name/tag.
 * @param options - Plugin add options (for inferring name/repo).
 * @returns Promise resolving to plugin data or null.
 */
async function pluginJSON_extractFromImage(
  image: string,
  options: PluginAddOptions
): Promise<PluginInfo | null> {
  const methods: Array<{
    name: string;
    fn: () => Promise<string | null>;
  }> = [
    {
      name: 'chris_plugin_info (post v0.3.0)',
      fn: async () => await pluginJSON_tryChrisPluginInfoWithArgs(image, options),
    },
    {
      name: 'chris_plugin_info (pre v0.3.0)',
      fn: async () => await pluginJSON_tryChrisPluginInfo(image),
    },
    {
      name: 'CMD --json (old chrisapp)',
      fn: async () => await pluginJSON_tryOldChrisapp(image),
    },
  ];

  for (const method of methods) {
    console.log(`Trying ${method.name}...`);
    const jsonString = await method.fn();

    if (jsonString && jsonString.trim() !== '') {
      try {
        const parsed: PluginInfo = JSON.parse(jsonString) as PluginInfo;
        console.log(`Successfully extracted plugin descriptor using ${method.name}`);
        return parsed;
      } catch (e) {
        const msg = `Failed to parse JSON from ${method.name}`;
        console.error(msg);
        errorStack.stack_push('error', msg, 'pluginJSON_extractFromImage');
      }
    }
  }

  const msg = 'All plugin descriptor extraction methods failed';
  errorStack.stack_push('error', msg, 'pluginJSON_extractFromImage');
  errorStack.stack_push(
    'error',
    'This plugin may not be a ChRIS plugin, or uses an unsupported format',
    'pluginJSON_extractFromImage'
  );
  return null;
}

/**
 * Tries chris_plugin_info with arguments (post 0.3.0 format).
 *
 * @param image - Docker image name/tag.
 * @param options - Plugin options for inferring name/repo.
 * @returns Promise resolving to JSON string or null.
 */
async function pluginJSON_tryChrisPluginInfoWithArgs(
  image: string,
  options: PluginAddOptions
): Promise<string | null> {
  const args: string[] = ['chris_plugin_info', '--dock-image', image];

  // Add optional arguments if available
  if (options.public_repo) {
    args.push('--public-repo', options.public_repo);
  }

  const command = `docker run --rm ${image} ${args.join(' ')}`;
  const result = await shellCommand_runWithDetails(command);

  if (!result.success || !result.stdout || result.stdout.trim() === '') {
    if (result.error || result.stderr) {
      errorStack.stack_push(
        'warning',
        `chris_plugin_info (with args) failed: ${result.error || result.stderr}`,
        'pluginJSON_tryChrisPluginInfoWithArgs'
      );
    }
    return null;
  }

  return result.stdout;
}

/**
 * Tries chris_plugin_info without arguments (pre 0.3.0 format).
 *
 * @param image - Docker image name/tag.
 * @returns Promise resolving to JSON string or null.
 */
async function pluginJSON_tryChrisPluginInfo(image: string): Promise<string | null> {
  const command = `docker run --rm ${image} chris_plugin_info`;
  const result = await shellCommand_runWithDetails(command);

  if (!result.success || !result.stdout || result.stdout.trim() === '') {
    if (result.error || result.stderr) {
      errorStack.stack_push(
        'warning',
        `chris_plugin_info failed: ${result.error || result.stderr}`,
        'pluginJSON_tryChrisPluginInfo'
      );
    }
    return null;
  }

  return result.stdout;
}

/**
 * Tries old chrisapp format by extracting CMD and running with --json.
 *
 * @param image - Docker image name/tag.
 * @returns Promise resolving to JSON string or null.
 */
async function pluginJSON_tryOldChrisapp(image: string): Promise<string | null> {
  // Get the CMD from the Docker image
  const cmd = await docker_getImageCmd(image);

  if (cmd.length === 0) {
    errorStack.stack_push(
      'warning',
      'Could not extract CMD from Docker image',
      'pluginJSON_tryOldChrisapp'
    );
    return null;
  }

  const command = `docker run --rm ${image} ${cmd[0]} --json`;
  console.log(`  Running: ${cmd[0]} --json`);
  const result = await shellCommand_runWithDetails(command);

  if (!result.success || !result.stdout || result.stdout.trim() === '') {
    if (result.error || result.stderr) {
      errorStack.stack_push(
        'warning',
        `${cmd[0]} --json failed: ${result.error || result.stderr}`,
        'pluginJSON_tryOldChrisapp'
      );
    }
    return null;
  }

  return result.stdout;
}

/**
 * Infers missing fields in plugin data from image name and options.
 *
 * Modifies pluginData in place.
 *
 * @param pluginData - Plugin data object to modify.
 * @param image - Docker image name/tag.
 * @param options - CLI options.
 */
function pluginData_inferMissingFields(
  pluginData: PluginInfo,
  image: string,
  options: PluginAddOptions
): void {
  if (!pluginData.name) {
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
    const repoGuess = image.split('/')[0] + '/' + path.basename(image.split(':')[0]);
    pluginData.public_repo = `https://github.com/${repoGuess}`;
    console.log(`Inferred public_repo: ${pluginData.public_repo}`);
  }
}

/**
 * Retries a registration operation with admin credential prompting.
 *
 * Allows up to 3 attempts. Uses provided credentials or prompts interactively.
 *
 * @param registrationFn - Function that attempts registration with credentials.
 * @param options - CLI options including admin credentials.
 * @returns Promise resolving to success boolean.
 */
async function registrationWithAuth_retry(
  registrationFn: (creds: AdminCredentials) => Promise<boolean>,
  options: PluginAddOptions
): Promise<boolean> {
  const MAX_ATTEMPTS = 3;

  // If credentials provided via flags, try once
  if (options.adminUser && options.adminPassword) {
    const creds: AdminCredentials = {
      username: options.adminUser,
      password: options.adminPassword,
    };
    return await registrationFn(creds);
  }

  // Interactive prompting with retry
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const creds = await adminCredentials_prompt(attempt, MAX_ATTEMPTS);

    if (!creds) {
      console.log('Authentication cancelled.');
      return false;
    }

    const success = await registrationFn(creds);
    if (success) {
      return true;
    }

    if (attempt < MAX_ATTEMPTS) {
      console.log('Authentication failed.');
    }
  }

  console.error(`Authentication failed after ${MAX_ATTEMPTS} attempts.`);
  return false;
}
