import { Command } from "commander";
// import { chrisConnection } from './chrisConnection';
import { chrisConnection } from "@fnndsc/cumin";

export function setupConnectCommand(program: Command): void {
  program
    .command("connect")
    .description("Connect to a ChRIS instance")
    .requiredOption("--user <user>", "Username for authentication")
    .requiredOption("--password <password>", "Password for authentication")
    .argument("<url>", "URL of the ChRIS instance")
    .action(async (url, options) => {
      try {
        await chrisConnection.connect({
          user: options.user,
          password: options.password,
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
      chrisConnection.logout();
    });
}
