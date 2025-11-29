import { Command } from "commander";
import {
  ChRISinode,
  ChRISinode_create,
  ListOptions,
  FilteredResourceData,
  params_fromOptions,
  ResourcesByFields,
  BrowserType,
} from "@fnndsc/cumin";

interface FSCLIoptions {
  page?: string;
  filefields?: string;
  dirfields?: string;
  linkfields?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any; // Allow dynamic CLI options from commander
}

/**
 * Lists resources for a given inode path.
 *
 * @param path - The inode path to list resources from.
 * @param options - CLI options for filtering and pagination.
 */
async function inodeResources_list(
  path: string,
  options: FSCLIoptions
): Promise<void> {
  const chrisInode: ChRISinode | null = await ChRISinode_create(path);
  if (!chrisInode) {
    console.error(`Could not find path '${path}' in the CUBE filesystem.`);
    return;
  }
  const params: ListOptions = params_fromOptions({
    ...options,
    returnFilter: "limit,offset",
  });
  const browserTypes: BrowserType[] = [
    BrowserType.Files,
    BrowserType.Links,
    BrowserType.Dirs,
  ];
  const fieldOptions = {
    [BrowserType.Files]: options.filefields,
    [BrowserType.Links]: options.linkfields,
    [BrowserType.Dirs]: options.dirfields,
  };
  for (const browserType of browserTypes) {
    const browser = chrisInode.browser_get(browserType);
    if (!browser) {
      console.error(
        `WARNING: ${browserType} browser is not available`
      );
      continue;
    }
    try {
      const resourceGet = browser.resource_get; 
      if (!resourceGet) { 
        console.error(`WARNING: ${browserType} resource is null`);
        continue;
      }

      const resourcesList = await resourceGet.resources_getList(params);
      const resourceFields = await resourceGet.resourceFields_get(
        resourcesList,
        fieldOptions[browserType]
      );
      const results: FilteredResourceData | null = resourceGet.resources_filterByFields(resourceFields);

      if (results) {
        console.log(`${browserType} resources:`);
        console.table(results.tableData, results.selectedFields);
      } else {
        console.error(`${browserType} resources: not found or could not be filtered`);
      }
    } catch (error) {
      console.error(`${browserType} resources: not found`);
    }
  }
}

/**
 * Displays resource fields for a given inode type.
 *
 * @param inodeType - The type of inode (e.g., "file properties").
 * @param dataObj - The object containing resource fields.
 * @returns True if fields were displayed, false otherwise.
 */
function inodeFields_list(inodeType: string, dataObj: ResourcesByFields | null): boolean { 
  if (!dataObj) {
    console.log("No " + inodeType + " at this path");
    return false;
  }
  if (dataObj.fields) {
    console.log(inodeType);
    console.table(dataObj.fields);
    return true;
  }
  return false;
}

/**
 * Lists all resource fields for different inode types (files, links, dirs).
 *
 * @param path - The base path for the inode.
 */
async function inodeResourceFields_list(path: string = ""): Promise<void> {
  const chrisFiles: ChRISinode | null = await ChRISinode_create(path);
  if (!chrisFiles) { 
    console.error(`Could not create ChRISinode for path: ${path}`);
    return;
  }

  const fileBrowser = chrisFiles.fileBrowser_get;
  const linkBrowser = chrisFiles.linkBrowser_get;
  const dirBrowser = chrisFiles.dirBrowser_get;

  let fileFields: ResourcesByFields | null = null;
  if (fileBrowser?.resource_get) {
    fileFields = await fileBrowser.resource_get.resourceFields_get();
  }
  inodeFields_list("file properties", fileFields);

  let linkFields: ResourcesByFields | null = null;
  if (linkBrowser?.resource_get) {
    linkFields = await linkBrowser.resource_get.resourceFields_get();
  }
  inodeFields_list("link properties", linkFields);

  let dirFields: ResourcesByFields | null = null;
  if (dirBrowser?.resource_get) {
    dirFields = await dirBrowser.resource_get.resourceFields_get();
  }
  inodeFields_list("dir properties", dirFields);
}

/**
 * Sets up the 'fobj' command for interacting with ChRIS filesystem objects.
 *
 * @param program - The Commander.js program instance.
 */
export async function fileBrowserCommand_setup(program: Command): Promise<void> {
  const pluginsCommand = program
    .command("fobj")
    .description("Interact with ChRIS file system objects");

  pluginsCommand
    .command("list [path]")
    .description("List filesystem elements")
    .option("-p, --page <size>", "Page size (default 20)")
    .option(
      "-f, --filefields <fields>",
      "Comma-separated list of fields to display for files"
    )
    .option(
      "-d, --dirfields <fields>",
      "Comma-separated list of fields to display for dirs"
    )
    .option(
      "-l, --linkfields <fields>",
      "Comma-separated list of fields to display for links"
    )
    .action(async (path, options) => {
      await inodeResources_list(path, options);
    });

  pluginsCommand
    .command("fieldslist [path]")
    .description("List the filebrowser resource fields")
    .action(async (path) => {
      await inodeResourceFields_list(path);
    });
}