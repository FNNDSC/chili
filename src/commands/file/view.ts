import { files_view } from "@fnndsc/salsa";
import { files_list_do } from "../files/list";
import { CLIoptions } from "../../utils/cli";
import { FilteredResourceData } from "@fnndsc/cumin";

/**
 * Core logic for 'file view'.
 *
 * @param fileIdentifier - The ID or name/path of the file.
 * @returns Promise resolving to string content (utf-8) or null.
 */
export async function files_view_do(fileIdentifier: string): Promise<string | null> {
  let fileId: number;

  if (/^\d+$/.test(fileIdentifier)) {
    fileId = parseInt(fileIdentifier, 10);
  } else {
    // Resolve name/path to ID
    // We treat fileIdentifier as a search term
    const options: CLIoptions = { search: fileIdentifier };
    // We search in 'files' asset type
    const results: FilteredResourceData | null = await files_list_do(options, "files");
    
    if (!results || !results.tableData || results.tableData.length === 0) {
        throw new Error(`File not found: ${fileIdentifier}`);
    }
    
    // Assume first match
    const item: Record<string, any> = results.tableData[0];
    if (!item.id) {
        throw new Error(`Could not determine ID for file: ${fileIdentifier}`);
    }
    fileId = item.id;
  }

  const buffer: Buffer | null = await files_view(fileId);
  if (!buffer) return null;
  return buffer.toString('utf-8');
}
