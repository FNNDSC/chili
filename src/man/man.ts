import { Command } from "commander";
import { topics_list } from "../commands/man/topics.js";
import { manpage_handle, ManPageOptions } from "../commands/man/doc.js";

/**
 * Sets up the 'man' command for displaying ChILI manual and help pages.
 *
 * @param program - The Commander.js program instance.
 */
export function manCommand_setup(program: Command): void {
  const manCommand: Command = program
    .command("man")
    .description("ChILI built in manual and help pages");

  manCommand
    .command("doc <topic>")
    .description("Display the manual document for a ChILI topic")
    .option("-b, --browser", "Open documentation in browser")
    .option("--style <style>", "Styling for headings", "figlet")
    .option("--width <N>", "Number of columns in the text response", parseInt)
    .action(async (topic, options: ManPageOptions) => {
      options.topic = topic;
      await manpage_handle(options);
    });

  manCommand
    .command("topics")
    .description("List the available manual page topics")
    .action(async () => {
      const files: string[] = await topics_list();
      console.log("\n\nThe following topics are available:");
      console.log("(read more with 'chili man doc <topic>')\n");
      console.log(files.join("\n"));
    });
}
