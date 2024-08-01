import { Command } from "commander";
import {
  ChRISinode,
  ChRISinode_create,
  ListOptions,
  FilteredResourceData,
  ResourcesFromOptions,
  optionsToParams,
  ResourcesByFields,
  BrowserType,
} from "@fnndsc/cumin";

interface FSCLIoptions {
  page?: string;
  filefields?: string;
  dirfields?: string;
  linkfields?: string;
  [key: string]: any;
}

async function listInodeResources(
  path: string,
  options: FSCLIoptions
): Promise<void> {
  const chrisInode: ChRISinode | null = await ChRISinode_create(path);
  if (!chrisInode) {
    console.error(`Could not find path '${path}' in the CUBE filesystem.`);
    return;
  }
  const params: ListOptions = optionsToParams({
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
    const browser = chrisInode.getBrowser(browserType);
    if (!browser || !browser._resource) {
      console.error(
        `WARNING: ${browserType} browser or its resource is not available`
      );
      continue;
    }
    try {
      const results: FilteredResourceData =
        await browser.resource.resources_filterByFields(
          await browser.resource.resourceFields_get(
            await browser.resource.resources_getList(params),
            fieldOptions[browserType]
          )
        );
      console.log(`${browserType} resources:`);
      console.table(results.tableData, results.selectedFields);
    } catch (error) {
      console.error(`${browserType} resources: not found`);
    }
  }
}

function fieldsList(inodeType: string, dataObj: ResourcesByFields): boolean {
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

async function listInodeResourceFields(path: string = ""): Promise<void> {
  const chrisFiles: ChRISinode | null = await ChRISinode_create(path);
  let fileFields: ResourcesByFields =
    await chrisFiles.fileBrowser.resource.resourceFields_get();
  fieldsList("file properties", fileFields);
  let linkFields: ResourcesByFields =
    await chrisFiles.linkBrowser.resource.resourceFields_get();
  fieldsList("link properties", linkFields);
  let dirFields: ResourcesByFields =
    await chrisFiles.dirBrowser.resource.resourceFields_get();
  fieldsList("dir properties", dirFields);
}

export async function setupFileBrowserCommand(program: Command): Promise<void> {
  const pluginsCommand = program
    .command("inode")
    .description("Interact with ChRIS inodes");

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
      await listInodeResources(path, options);
    });

  pluginsCommand
    .command("fieldslist [path]")
    .description("List the filebrowser resource fields")
    .action(async (path) => {
      await listInodeResourceFields(path);
    });
}
