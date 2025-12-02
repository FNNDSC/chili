import { ListOptions, chrisContext, Context, errorStack, Result, Ok, Err } from "@fnndsc/cumin";
import { keyPairParams_apply } from "@fnndsc/cumin";
import path from "path"; // Node.js path module for joining paths
import { pathMapper_get } from "../path/pathMapper.js";

export interface CLIoptions {
  page?: string;
  fields?: string;
  search?: string;
  params?: string;
  content?: string; // New option for file create
  fromFile?: string; // New option for file create
  path?: string; // New option for explicit base path
  name?: string; // New option for explicit filename
  all?: boolean; // New option for listing all items
  table?: boolean; // Added option for table format
  csv?: boolean; // Added option for CSV format
  sort?: string; // Sort field name
  reverse?: boolean; // Reverse sort order
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any; // Allow dynamic CLI options from commander
}

export function options_toParams(
  options: CLIoptions,
  keyPairField: keyof CLIoptions = "search"
): ListOptions {
  const baseParams: ListOptions = {
    limit: options.limit ? Number(options.limit) : (options.page ? parseInt(options.page, 10) : 20),
    offset: options.offset ? Number(options.offset) : 0,
    fields: options.fields,
  };

  const keyPairValue = options[keyPairField];

  if (typeof keyPairValue === "string") {
    return keyPairParams_apply(baseParams, keyPairValue);
  }

  return baseParams;
}

/**
 * Resolves a ChRIS filesystem path based on various inputs.
 *
 * This function builds the logical path from inputs, then converts it to
 * the physical path where data actually resides (resolving any links).
 *
 * @param fileIdentifier - The primary argument, which can be a filename or a path fragment (relative or absolute).
 * @param options - CLI options including optional `path` (base directory) and `name` (explicit filename).
 * @returns The fully resolved absolute ChRIS physical path.
 */
export async function path_resolveChrisFs(
  fileIdentifier: string | undefined,
  options: { path?: string; name?: string }
): Promise<string> {
  // 1. Build the logical path first
  let logicalPath: string;

  if (fileIdentifier && fileIdentifier.startsWith('/')) {
    // Absolute path provided
    logicalPath = fileIdentifier.replace(/\/\//g, '/');
  } else {
    // Relative path - determine base directory
    let baseDir: string;
    if (options.path) {
      baseDir = options.path;
    } else {
      const currentContext = await chrisContext.current_get(Context.ChRISfolder);
      baseDir = currentContext || "/";
    }

    if (!baseDir.startsWith('/')) {
      baseDir = `/${baseDir}`;
    }

    // Determine the path fragment to join
    let pathFragment: string;
    if (options.name) {
      pathFragment = options.name;
    } else if (fileIdentifier) {
      pathFragment = fileIdentifier;
    } else {
      // No fileIdentifier or name - use current directory as logical path
      logicalPath = baseDir.replace(/\/\//g, '/');
      // Convert to physical and return
      const physicalResult: Result<string> = await logical_toPhysical(logicalPath);
      if (!physicalResult.ok) {
        errorStack.stack_push('error', 'Failed to resolve current directory to physical location');
        return logicalPath; // Fallback to logical
      }
      return physicalResult.value;
    }

    logicalPath = path.posix.join(baseDir, pathFragment).replace(/\/\/\//g, '/');
  }

  // 2. Convert logical path to physical path
  const physicalResult: Result<string> = await logical_toPhysical(logicalPath);

  if (!physicalResult.ok) {
    errorStack.stack_push('error', `Failed to resolve logical path '${logicalPath}' to physical location`);
    return logicalPath; // Fallback to using logical path directly
  }

  return physicalResult.value;
}

/**
 * Resolves a logical path to its physical path by following links.
 *
 * This function delegates to the PathMapper singleton, which uses
 * hierarchical caching to optimize repeated resolutions with common prefixes.
 *
 * Example:
 *   Logical:  /home/user/public/data
 *   Where:    public -> /PUBLIC
 *   Physical: /PUBLIC/data
 *
 * @param logicalPath - The logical (apparent) path the user sees/navigates
 * @returns A Result containing the physical path, or Err if path is invalid
 */
export async function logical_toPhysical(logicalPath: string): Promise<Result<string>> {
  const mapper = pathMapper_get();
  return mapper.logical_toPhysical(logicalPath);
}

/**
 * Clears the path mapping cache. Useful when links are created/deleted.
 */
export function linkCache_clear(): void {
  const mapper = pathMapper_get();
  mapper.cache_clear();
}