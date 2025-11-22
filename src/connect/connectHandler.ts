import { Command } from "commander";
import { chrisConnection } from "@fnndsc/cumin";

/**
 * Sets up the 'connect' and 'logout' commands for the CLI program.
 *
 * @param program - The Commander.js program instance.
 */
export function connectCommand_setup(program: Command): void {
  program
    .command("connect")
    .description("Connect to a ChRIS instance")
    .requiredOption("--user <user>", "Username for authentication")
    .requiredOption("--password <password>", "Password for authentication")
    .option("--debug", "if errors, throw debug info to console", false)
    .argument("<url>", "URL of the ChRIS instance")
    .action(async (url, options) => {
      try {
        await chrisConnection.connection_connect({
          user: options.user,
          password: options.password,
          debug: options.debug,
          url: url,
        });
      } catch (error) {
        console.error("Failed to connect:", error);
      }
    });

  program
    .command("logout")
    .description("Log out from ChRIS")
    .action(() => {
      chrisConnection.connection_logout();
    });
}
