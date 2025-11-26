/**
 * @file Implements the setup for connection-related CLI commands.
 *
 * This module provides the `connectCommand_setup` function which configures
 * the `connect` and `logout` commands in the main CLI program.
 *
 * @module
 */
import { Command } from "commander";
import { connect_login } from "../commands/connect/login.js";
import { connect_logout } from "../commands/connect/logout.js";
import { ConnectOptions } from "@fnndsc/salsa";
import { CLIoptions } from "../utils/cli.js";

/**
 * Sets up the 'connect' and 'logout' commands for the CLI program.
 *
 * @param program - The Commander.js program instance.
 */
export function connectCommand_setup(program: Command): void {
  program
    .command("connect <url>")
    .description("Connect to a ChRIS CUBE instance")
    .option("-u, --user <user>", "username")
    .option("-p, --password <password>", "password")
    .action(async (url: string, options: CLIoptions) => {
      const connectOptions: ConnectOptions = {
        url,
        user: options.user,
        password: options.password,
        debug: false, // Default to false as it's not directly in CLI options here
      };
      await connect_login(connectOptions);
    });

  program
    .command("logout")
    .description("Log out from ChRIS")
    .action(async () => {
      await connect_logout();
    });
}
