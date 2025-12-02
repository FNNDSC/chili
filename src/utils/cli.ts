import { ListOptions, chrisContext, Context, errorStack, Result, Ok, Err } from "@fnndsc/cumin";
import { keyPairParams_apply } from "@fnndsc/cumin";
import path from "path"; // Node.js path module for joining paths
import { files_listAll } from "@fnndsc/salsa";

// Simple cache for link data to avoid repeated API calls
interface LinkCacheEntry {
  links: Map<string, string>; // linkName -> target
  timestamp: number;
}

const linkCache: Map<string, LinkCacheEntry> = new Map();
const CACHE_TTL_MS: number = 30000; // 30 seconds

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
 * This function walks the path tree from root, checking each component
 * to see if it's a link. When a link is encountered, it jumps to the
 * link's target and continues from there.
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
  // Validate input
  if (!logicalPath || typeof logicalPath !== 'string') {
    errorStack.stack_push('error', 'Invalid path: path must be a non-empty string');
    return Err();
  }

  // Normalize path (ensure it starts with /)
  const normalizedPath: string = logicalPath.startsWith('/') ? logicalPath : `/${logicalPath}`;

  // Split into components, filtering out empty strings
  const parts: string[] = normalizedPath.split('/').filter((p: string) => p.length > 0);

  // Root directory case
  if (parts.length === 0) {
    return Ok('/');
  }

  let physicalCurrent: string = '/';

  // Walk each component of the path
  for (let i: number = 0; i < parts.length; i++) {
    const part: string = parts[i];

    // Build the candidate path in the current physical directory
    const candidatePath: string = physicalCurrent === '/'
      ? `/${part}`
      : `${physicalCurrent}/${part}`;

    try {
      // Check if this component is a link in its parent directory
      const linkTarget: string | null = await link_checkAndResolve(candidatePath);

      if (linkTarget) {
        // It's a link! Jump to the target
        physicalCurrent = linkTarget;
      } else {
        // Not a link, continue building the physical path
        physicalCurrent = candidatePath;
      }
    } catch (error: unknown) {
      // Link resolution failed - log warning but continue
      const msg: string = error instanceof Error ? error.message : String(error);
      errorStack.stack_push(
        'warning',
        `Failed to check if '${candidatePath}' is a link: ${msg}. Treating as regular path.`
      );
      // Assume it's not a link and continue
      physicalCurrent = candidatePath;
    }
  }

  return Ok(physicalCurrent);
}

/**
 * Checks if a path is a link and returns its target, or null if not a link.
 *
 * Uses a cache to avoid repeated API calls for the same directory.
 *
 * @param candidatePath - The path to check
 * @returns The link target if it's a link, null otherwise
 */
async function link_checkAndResolve(candidatePath: string): Promise<string | null> {
  // Extract parent directory for fetching links
  const parts: string[] = candidatePath.split('/');
  const filename: string = parts.pop() || '';
  const parentDir: string = parts.join('/') || '/';

  // Normalize the candidate path
  const normalizedCandidate: string = candidatePath.startsWith('/')
    ? candidatePath
    : `/${candidatePath}`;

  // Check cache first
  const cached: LinkCacheEntry | undefined = linkCache.get(parentDir);
  const now: number = Date.now();

  if (cached && (now - cached.timestamp) < CACHE_TTL_MS) {
    // Cache hit! Check if this path is a link
    const target: string | undefined = cached.links.get(normalizedCandidate);
    return target || null;
  }

  // Cache miss or expired - fetch from API
  try {
    const fetchOpts: Record<string, string | number> = { limit: 1000, offset: 0 };
    const linksResult = await files_listAll(fetchOpts, 'links', parentDir);

    // Build the link map for this directory
    const linksMap: Map<string, string> = new Map();

    if (linksResult && linksResult.tableData) {
      for (const linkRaw of linksResult.tableData) {
        const linkFname: string = (linkRaw.fname as string) || '';
        const linkPath: string = (linkRaw.path as string) || '';

        // Normalize link fname
        const normalizedLinkFname: string = linkFname.startsWith('/')
          ? linkFname
          : `/${linkFname}`;

        // Remove .chrislink extension to get the logical path
        if (normalizedLinkFname.endsWith('.chrislink')) {
          const logicalPath: string = normalizedLinkFname.slice(0, -10);
          const target: string = linkPath.startsWith('/') ? linkPath : `/${linkPath}`;
          linksMap.set(logicalPath, target);
        }
      }
    }

    // Update cache
    linkCache.set(parentDir, {
      links: linksMap,
      timestamp: now
    });

    // Return the target if it's a link
    const target: string | undefined = linksMap.get(normalizedCandidate);
    return target || null;

  } catch (error: unknown) {
    // Error fetching links - propagate to caller
    throw error;
  }
}

/**
 * Clears the link cache. Useful when links are created/deleted.
 */
export function linkCache_clear(): void {
  linkCache.clear();
}