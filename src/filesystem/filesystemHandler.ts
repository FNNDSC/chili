import { Command } from "commander";
import {
  ChRISFilesGetFiles,
  createChrisFilesGetFiles,
  ListOptions,
  FilteredResourceData,
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
  const chrisFiles: ChRISFilesGetFiles = await createChrisFilesGetFiles();
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

async function listFileResourceFields(): Promise<void> {
  console.log("Declarig new ChRISFiles...");
  const chrisFiles: ChRISFilesGetFiles = await createChrisFilesGetFiles(
    "rudolphpienaar/uploads",
  );
  console.log("In listFileResourceFields");
  console.log(chrisFiles);
  const results = await chrisFiles.inode.resource.resourceFields_get();
  console.table(results.fields);
}

export function setupFileBrowserCommand(program: Command): void {
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
