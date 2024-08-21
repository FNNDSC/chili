import { Command } from "commander";
import fs from "fs";
import path from "path";
import chalk from "chalk";
import { marked } from "marked";
import { exec, execSync, ExecException } from "child_process";
import url from "url";
import os from "os";
import { faBook } from "@fortawesome/free-solid-svg-icons";
import { library, icon, dom } from "@fortawesome/fontawesome-svg-core";
import { faCamera } from "@fortawesome/free-solid-svg-icons";

library.add(faCamera);
interface ManPageOptions {
  topic: string;
  browser?: boolean;
}

const docDir: string = path.join(projectDir_get(), "doc");

function projectDir_get(): string {
  const currentFilePath: string = import.meta.url;
  const currentDirectory: string = path.dirname(currentFilePath);

  let directoryToCheck: string | null = currentDirectory;
  while (directoryToCheck) {
    const packageJsonPath: string = path.join(directoryToCheck, "package.json");
    const filePath = url.fileURLToPath(packageJsonPath);
    if (fs.existsSync(filePath)) {
      return url.fileURLToPath(directoryToCheck);
    }
    directoryToCheck = path.dirname(directoryToCheck);
  }
  return url.fileURLToPath(currentDirectory);
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
  const tempHtmlPath: string = path.join(
    os.tmpdir(),
    path.basename(filePath).replace(".adoc", ".html")
  );

  try {
    execSync(`asciidoctor -o ${tempHtmlPath} ${filePath}`);

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
  }
}

async function topics_list(): Promise<string[]> {
  library.add(faBook);
  const bookIcon = "";
  const files: string[] = fs.readdirSync(docDir);
  const adocFiles: string[] = files.filter(
    (file: string) => path.extname(file) === ".adoc"
  );
  const formattedOutput: string[] = adocFiles.map(
    (file: string) => `${bookIcon} ${path.basename(file, ".adoc")}`
  );
  return formattedOutput;
}

function manpage_handle(options: ManPageOptions): void {
  const docPath: string = path.join(docDir, `${options.topic}.adoc`);

  if (!fs.existsSync(docPath)) {
    console.error(`Documentation for '${options.topic}' not found.`);
    return;
  }

  if (options.browser) {
    openInBrowser(docPath);
  } else {
    const content: string = fs.readFileSync(docPath, "utf-8");
    console.log(renderAsciidoc(content));
  }
}

export function setupManCommand(program: Command): void {
  const manCommand: Command = program
    .command("man")
    .description("ChILI built in manual and help pages");

  manCommand
    .command("doc <topic>")
    .description("Display the manual document for a ChILI topic")
    .option("-b, --browser", "Open documentation in browser")
    .action((topic, options: ManPageOptions) => {
      options.topic = topic;
      manpage_handle(options);
    });

  manCommand
    .command("topics")
    .description("List the available manual page topics")
    .action(async () => {
      const files: string[] = await topics_list();
      console.log("\n\nThe following topics are available:");
      console.log("(read more with 'chili man doc <topic>'\n");
      console.log(files.join("\n"));
    });
}
