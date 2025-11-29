/**
 * @file Implements the core logic for the `rm` command in the ChRIS CLI.
 *
 * This module provides functionality to delete files, directories, and links
 * from the ChRIS file system. It determines the type of the target and calls
 * the appropriate delete function.
 *
 * @module
 */
import { files_listAll } from "@fnndsc/salsa";
import { files_delete as salsaFiles_delete } from "@fnndsc/salsa";
import { path_resolveChrisFs } from "../../utils/cli.js";
import { ChrisFileOrDirRaw } from "../../models/resource.js";
import { FilteredResourceData } from "@fnndsc/cumin";

export interface RmOptions {
  recursive?: boolean;
  force?: boolean;
}

export interface RmResult {
  success: boolean;
  path: string;
  type: 'file' | 'dir' | 'link' | null;
  error?: string;
}

/**
 * Finds a file/dir/link by path and returns its type and ID.
 *
 * @param targetPath - The resolved path to search for.
 * @returns An object with type, id, and name, or null if not found.
 */
async function pathInfo_find(targetPath: string): Promise<{ type: 'file' | 'dir' | 'link'; id: number; name: string } | null> {
  // Extract parent directory and basename
  const parts: string[] = targetPath.split('/').filter((p: string) => p);
  const basename: string = parts.pop() || '';
  const parentPath: string = '/' + parts.join('/');

  const fetchOpts: Record<string, string | number> = { limit: 1000, offset: 0 };

  // Search in all three asset types within the parent directory
  const [dirs, files, links] = await Promise.all([
    files_listAll(fetchOpts, 'dirs', parentPath),
    files_listAll(fetchOpts, 'files', parentPath),
    files_listAll(fetchOpts, 'links', parentPath)
  ]);

  // Helper to extract name from raw object
  const extractName = (raw: ChrisFileOrDirRaw): string => {
    let name: string = raw.fname || raw.path || "";
    if (name.includes('/')) {
      name = name.split('/').pop() || name;
    }
    return name;
  };

  // Check directories
  if (dirs && dirs.tableData) {
    for (const d of dirs.tableData) {
      if (extractName(d) === basename && d.id) {
        return { type: 'dir', id: d.id, name: basename };
      }
    }
  }

  // Check files
  if (files && files.tableData) {
    for (const f of files.tableData) {
      if (extractName(f) === basename && f.id) {
        return { type: 'file', id: f.id, name: basename };
      }
    }
  }

  // Check links
  if (links && links.tableData) {
    for (const l of links.tableData) {
      if (extractName(l) === basename && l.id) {
        return { type: 'link', id: l.id, name: basename };
      }
    }
  }

  return null;
}

/**
 * Core logic for the 'rm' command.
 *
 * @param targetPath - The path to delete.
 * @param options - Options including recursive and force flags.
 * @returns A Promise resolving to RmResult.
 */
export async function files_rm(targetPath: string, options: RmOptions = {}): Promise<RmResult> {
  try {
    // Resolve the path
    const resolvedPath: string = await path_resolveChrisFs(targetPath, {});

    // Find the target
    const info = await pathInfo_find(resolvedPath);

    if (!info) {
      return {
        success: false,
        path: resolvedPath,
        type: null,
        error: `No such file or directory: ${resolvedPath}`
      };
    }

    // Check if it's a directory and recursive flag is not set
    if (info.type === 'dir' && !options.recursive) {
      return {
        success: false,
        path: resolvedPath,
        type: info.type,
        error: `Cannot remove directory '${resolvedPath}': is a directory (use -r for recursive delete)`
      };
    }

    // Delete the resource
    const assetName: string = info.type === 'dir' ? 'dirs' : info.type === 'link' ? 'links' : 'files';
    const deleted: boolean = await salsaFiles_delete(info.id, assetName);

    return {
      success: deleted,
      path: resolvedPath,
      type: info.type,
      error: deleted ? undefined : `Failed to delete ${info.type}: ${resolvedPath}`
    };

  } catch (error: unknown) {
    const errorMsg: string = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      path: targetPath,
      type: null,
      error: errorMsg
    };
  }
}
