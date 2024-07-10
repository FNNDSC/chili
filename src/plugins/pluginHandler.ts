import { Command } from "commander";
import { chrisPlugin, ListOptions, FilteredResourceData } from "@fnndsc/cumin";

interface PluginCLIoptions {
  page?: string;
  fields?: string;
  [key: string]: any;
}

function optionsToParams(pluginOptions: PluginCLIoptions): ListOptions {
  return {
    limit: pluginOptions.page ? parseInt(pluginOptions.page, 10) : 20,
    offset: 0,
    name: undefined,
    fields: pluginOptions.fields,
  };
}

async function listPlugins(options: PluginCLIoptions): Promise<void> {
  const params: ListOptions = optionsToParams(options);
  const results: FilteredResourceData =
    await chrisPlugin.asset.resources_filterByFields(
      await chrisPlugin.asset.resourceFields_get(
        await chrisPlugin.asset.resources_getList(params),
      ),
    );
  console.table(results.tableData, results.selectedFields);
}

async function listPluginFields(): Promise<void> {
  const results = await chrisPlugin.asset.resourceFields_get();
  console.table(results.fields);
}

export function setupPluginsCommand(program: Command): void {
  const pluginsCommand = program
    .command("plugins")
    .description("Interact with ChRIS plugins");

  pluginsCommand
    .command("list")
    .description("List plugins")
    .option("-p, --page <size>", "Page size (default 20)")
    .option(
      "-f, --fields <fields>",
      "Comma-separated list of fields to display",
    )
    .action(async (options) => {
      await listPlugins(options);
    });

  pluginsCommand
    .command("fieldslist")
    .description("List the plugin resource fields")
    .action(async () => {
      await listPluginFields();
    });
}
