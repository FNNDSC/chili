import { ListOptions, chrisContext, Context } from "@fnndsc/cumin";
import { keyPairParams_apply } from "@fnndsc/cumin";
import path from "path"; // Node.js path module for joining paths

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
 * @param fileIdentifier - The primary argument, which can be a filename or a path fragment (relative or absolute).
 * @param options - CLI options including optional `path` (base directory) and `name` (explicit filename).
 * @returns The fully resolved absolute ChRIS path.
 */
export async function path_resolveChrisFs(
  fileIdentifier: string | undefined,
  options: { path?: string; name?: string }
): Promise<string> {
  // If fileIdentifier is explicitly absolute, use it directly.
  if (fileIdentifier && fileIdentifier.startsWith('/')) {
    return fileIdentifier.replace(/\/\//g, '/'); // Normalize double slashes
  }

  // 1. Determine base directory
  let baseDir: string;
  if (options.path) {
    baseDir = options.path;
  } else {
    const currentContext = await chrisContext.current_get(Context.ChRISfolder);
    baseDir = currentContext || "/";
  }

  if (!baseDir.startsWith('/')) { // Ensure baseDir is absolute
    baseDir = `/${baseDir}`;
  }

  // 2. Determine the filename/pathFragment to be joined to baseDir
  let pathFragment: string;
  if (options.name) {
    pathFragment = options.name;
  } else if (fileIdentifier) {
    pathFragment = fileIdentifier;
  } else {
    // No fileIdentifier or name - use current directory
    return baseDir.replace(/\/\//g, '/'); // Normalize and return baseDir
  }

  const resolvedPath = path.posix.join(baseDir, pathFragment);
  return resolvedPath.replace(/\/\/\//g, '/'); // Final normalization
}