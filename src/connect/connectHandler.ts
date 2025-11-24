import { Command } from "commander";
import { login_do } from "../commands/connect/login";
import { logout_do } from "../commands/connect/logout";

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
      await login_do({
        user: options.user,
        password: options.password,
        debug: options.debug,
        url: url,
      });
    });

  program
    .command("logout")
    .description("Log out from ChRIS")
    .action(async () => {
      await logout_do();
    });
}
