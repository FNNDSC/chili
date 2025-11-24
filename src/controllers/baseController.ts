import {
  FilteredResourceData,
  ChRISPluginGroup,
  ChRISFeedGroup,
  ChRISEmbeddedResourceGroup, // For file system groups
  ListOptions,
  QueryHits,
  record_extract,
  params_fromOptions,
  ResourcesByFields
} from "@fnndsc/cumin";
import { CLIoptions } from "../utils/cli.js";

/**
 * Base controller for managing ChRIS resources.
 * Encapsulates business logic for fetching, filtering, and deleting resources.
 * UI-agnostic.
 */
export class BaseController {
  chrisObject:
    | ChRISPluginGroup
    | ChRISFeedGroup
    | ChRISEmbeddedResourceGroup<any>; // Use any for generic type for now

  constructor(
    chrisObject:
      | ChRISPluginGroup
      | ChRISFeedGroup
      | ChRISEmbeddedResourceGroup<any>
  ) {
    this.chrisObject = chrisObject;
  }

  /**
   * Fetches and filters resources based on provided options.
   *
   * @param options - CLI options for filtering and pagination.
   * @returns A Promise resolving to FilteredResourceData or null if no resources found.
   */
  async resources_get(options: CLIoptions): Promise<FilteredResourceData | null> {
    try {
      const params = params_fromOptions(options);
      const results: FilteredResourceData | null =
        await this.chrisObject.asset.resources_listAndFilterByOptions(params);
      return results;
    } catch (error) {
      // Error handling is delegated to the caller or logged to errorStack
      // For now, we let the errorStack mechanisms in cumin handle internal logging
      // but we might want to bubble up specific errors.
      return null;
    }
  }

  /**
   * Fetches the available fields for the resource type.
   *
   * @returns A Promise resolving to ResourcesByFields or null.
   */
  async resourceFields_get(): Promise<ResourcesByFields | null> {
    return await this.chrisObject.asset.resourceFields_get();
  }

  /**
   * Deletes a resource by its ID.
   *
   * @param id - The ID of the resource to delete.
   * @returns A Promise resolving to true if successful, false otherwise.
   */
  async resource_delete(id: number): Promise<boolean> {
    return await this.chrisObject.asset.resourceItem_delete(id);
  }

  /**
   * Resolves search terms to a list of resource IDs.
   *
   * @param options - CLI options containing search terms.
   * @returns A Promise resolving to an array of IDs or null.
   */
  async resourceIDs_resolve(options: CLIoptions): Promise<number[] | null> {
    const params: ListOptions = params_fromOptions(options);
    const searchResults: FilteredResourceData | null =
      await this.chrisObject.asset.resources_listAndFilterByOptions(params);
    
    if (!searchResults) {
      return null;
    }
    
    const queryHits: QueryHits = record_extract(
      searchResults.tableData,
      "id"
    );
    return queryHits.hits as number[];
  }
}
