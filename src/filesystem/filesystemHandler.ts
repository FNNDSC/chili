import { Command } from "commander";
import {
  ChRISinode,
  ChRISinode_create,
  ListOptions,
  FilteredResourceData,
  ResourcesByFields
} from "@fnndsc/cumin";

interface FSCLIoptions {
  page?: string;
  fields?: string;
  [key: string]: any;
}

function optionsToParams(pluginOptions: FSCLIoptions): ListOptions {
  return {
    limit: pluginOptions.page ? parseInt(pluginOptions.page, 10) : 20,
    offset: 0,
    name: undefined,
    fields: pluginOptions.fields,
  };
}

async function listFileResources(options: FSCLIoptions): Promise<void> {
  const chrisFiles: ChRISinode|null = await ChRISinode_create();
  const params: ListOptions = optionsToParams(options);
  console.log("In listFileResources");
  const results: FilteredResourceData =
    await chrisFiles.inode.resource.resources_filterByFields(
      await chrisFiles.inode.resource.resourceFields_get(
        await chrisFiles.inode.resource.resources_getList(params),
      ),
    );
  console.table(results.tableData, results.selectedFields);
}

function fieldsList(inodeType: string, dataObj: ResourcesByFields): boolean {
  if(!dataObj) {
    console.log("No " + inodeType + " at this path");
    return false;
  }
  if(dataObj.fields) {
    console.log(inodeType);
    console.table(dataObj.fields);
    return true;
  }
  return false;
} 

async function listFileResourceFields(): Promise<void> {
  const chrisFiles: ChRISinode|null = await ChRISinode_create(
    "home/rudolphpienaar/uploads",
  );
  let fileFields: ResourcesByFields = await chrisFiles.fileBrowser.resource.resourceFields_get();
  fieldsList("file properties", fileFields);
  let linkFields: ResourcesByFields = await chrisFiles.linkBrowser.resource.resourceFields_get();
  fieldsList("link properties", linkFields)
  let dirFields: ResourcesByFields = await chrisFiles.dirBrowser.resource.resourceFields_get();
  fieldsList("dir properties", dirFields);
}

export async function setupFileBrowserCommand(program: Command): Promise<void> {
  const pluginsCommand = program
    .command("inode")
    .description("Interact with ChRIS inodes");

  pluginsCommand
    .command("list")
    .description("List filesystem elements")
    .option("-p, --page <size>", "Page size (default 20)")
    .option(
      "-f, --fields <fields>",
      "Comma-separated list of fields to display",
    )
    .action(async (options) => {
      await listFileResources(options);
    });

  pluginsCommand
    .command("fieldslist")
    .description("List the filebrowser resource fields")
    .action(async () => {
      await listFileResourceFields();
    });
}
