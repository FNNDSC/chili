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
import { login_render, logout_render } from "../views/connect.js";
import { ConnectOptions } from "@fnndsc/salsa";
import { CLIoptions } from "../utils/cli.js";
import chalk from "chalk";

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
      const user = options.user || 'unknown';
      const connectOptions: ConnectOptions = {
        url,
        user: options.user,
        password: options.password,
        debug: false,
      };
      
      try {
        const success: boolean = await connect_login(connectOptions);
        console.log(login_render(success, url, user));
      } catch (error: unknown) {
        console.log(login_render(false, url, user));
        const msg = error instanceof Error ? error.message : String(error);
        console.error(chalk.red(`Error: ${msg}`));
      }
    });

  program
    .command("logout")
    .description("Log out from ChRIS")
    .action(async () => {
      try {
        await connect_logout();
        console.log(logout_render(true));
      } catch (error: unknown) {
        console.log(logout_render(false));
        const msg = error instanceof Error ? error.message : String(error);
        console.error(chalk.red(`Error: ${msg}`));
      }
    });
}
