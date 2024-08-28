import { Command } from "commander";
import fs from "fs";
import path from "path";
import chalk from "chalk";
import figlet from "figlet";
import { marked } from "marked";
import asciidoctor from "asciidoctor";
import * as highlight from "cli-highlight";
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

interface HeadingStyle {
  regex: RegExp;
  font: figlet.Fonts;
  color: chalk.Chalk;
}

const headingStyles: HeadingStyle[] = [
  { regex: /<h1.*?>(.*?)<\/h1>/g, font: "Standard", color: chalk.magenta },
  { regex: /<h2.*?>(.*?)<\/h2>/g, font: "Slant", color: chalk.yellow },
  { regex: /<h3.*?>(.*?)<\/h3>/g, font: "Small", color: chalk.green },
  { regex: /<h4.*?>(.*?)<\/h4>/g, font: "Mini", color: chalk.blue },
];

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

function adocToHtml(content: string): string {
  const ascii: ReturnType<typeof asciidoctor> = asciidoctor();
  let result: string = ascii.convert(content, {
    standalone: false,
    attributes: {
      showtitle: "",
      sectlinks: "",
      sectanchors: "",
    },
  }) as string;
  return result;
}

async function renderAsciidoc(content: string): Promise<string> {
  let result: string = adocToHtml(content);

  const createFiglet = (text: string, font: figlet.Fonts): Promise<string> => {
    return new Promise((resolve) => {
      figlet.text(text, { font }, (err, data) => {
        resolve(err ? text : data || text);
      });
    });
  };

  const processHeading = async (
    text: string,
    style: HeadingStyle
  ): Promise<string> => {
    const figletText = await createFiglet(text, style.font);
    return style.color(figletText);
  };

  // Process headings
  for (const style of headingStyles) {
    const matches = result.match(style.regex) || [];
    for (const match of matches) {
      const text = match
        .replace(/<\/?h[1-4].*?>/g, "")
        .replace(/<a.*?>(.*?)<\/a>/g, "$1");
      const processed = await processHeading(text, style);
      result = result.replace(match, `\n${processed}\n`);
    }
  }

  // Process other elements
  result = result
    .replace(/<code>(.*?)<\/code>/g, (_, p1) => chalk.cyan(p1))
    .replace(/<em>(.*?)<\/em>/g, (_, p1) => chalk.italic(p1))
    .replace(/<\/?div.*?>/g, "")
    .replace(/<p>(.*?)<\/p>/g, "$1\n\n")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/<a.*?>(.*?)<\/a>/g, "$1")
    .replace(/<\/?[^>]+(>|$)/g, "")
    .trim();

  return result;
}

function openInBrowser(filePath: string): void {
  const ascii: ReturnType<typeof asciidoctor> = asciidoctor();
  const tempHtmlPath: string = path.join(
    os.tmpdir(),
    path.basename(filePath).replace(".adoc", ".html")
  );

  try {
    // Read the AsciiDoc content
    const content: string = fs.readFileSync(filePath, "utf-8");

    // Convert AsciiDoc to HTML
    const html: string = ascii.convert(content, {
      safe: "safe",
      standalone: true,
      attributes: { showtitle: true },
    }) as string;

    // Write the HTML to a temporary file
    fs.writeFileSync(tempHtmlPath, html);

    // Open the HTML file in the default browser
    const command: string =
      process.platform === "win32"
        ? "start"
        : process.platform === "darwin"
        ? "open"
        : "xdg-open";

    exec(`${command} ${tempHtmlPath}`, (error: ExecException | null) => {
      if (error) {
        console.error("Error opening browser:", error);
      }
    });
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

async function manpage_handle(options: ManPageOptions): Promise<void> {
  const docPath: string = path.join(docDir, `${options.topic}.adoc`);

  if (!fs.existsSync(docPath)) {
    console.error(`Documentation for '${options.topic}' not found.`);
    return;
  }

  if (options.browser) {
    openInBrowser(docPath);
  } else {
    const content: string = fs.readFileSync(docPath, "utf-8");
    console.log(await renderAsciidoc(content));
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
      console.log("(read more with 'chili man doc <topic>'\n");
      console.log(files.join("\n"));
    });
}
