import { Command } from "commander";
import fs from "fs";
import path from "path";
import chalk from "chalk";
import { marked } from "marked";
import { execSync } from "child_process";

export function setupManCommand(program: Command): void {
  program
    .command("man <topic>")
    .description("Display the manual for a ChILI topic")
    .option("-b, --browser", "Open documentation in browser")
    .action((topic: string, options: { browser?: boolean }) => {
      const docPath: string = path.join(
        __dirname,
        "..",
        "doc",
        `${topic}.adoc`
      );

      if (!fs.existsSync(docPath)) {
        console.error(`Documentation for '${topic}' not found.`);
        return;
      }

      if (options.browser) {
        openInBrowser(docPath);
      } else {
        const content: string = fs.readFileSync(docPath, "utf-8");
        console.log(renderAsciidoc(content));
      }
    });
}

function renderAsciidoc(content: string): string {
  const html: string = marked(content);
  return html
    .replace(/<h1>(.*?)<\/h1>/g, (_, p1: string) =>
      chalk.bold.underline.green(p1)
    )
    .replace(/<h2>(.*?)<\/h2>/g, (_, p1: string) => chalk.bold.yellow(p1))
    .replace(/<code>(.*?)<\/code>/g, (_, p1: string) => chalk.cyan(p1))
    .replace(/<\/?[^>]+(>|$)/g, ""); // Remove remaining HTML tags
}

function openInBrowser(filePath: string): void {
  const tempHtmlPath: string = filePath.replace(".adoc", ".html");

  try {
    // Convert asciidoc to HTML
    execSync(`asciidoctor -o ${tempHtmlPath} ${filePath}`);

    // Open the HTML file in the default browser
    const command: string =
      process.platform === "win32"
        ? "start"
        : process.platform === "darwin"
        ? "open"
        : "xdg-open";
    execSync(`${command} ${tempHtmlPath}`);
  } catch (error: unknown) {
    console.error(
      "Error opening documentation in browser:",
      error instanceof Error ? error.message : String(error)
    );
  } finally {
    // Clean up the temporary HTML file
    fs.unlinkSync(tempHtmlPath);
  }
}
