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
  style: "figlet" | "ascii";
  width?: number;
}

interface ASCIIHeadingStyle {
  regex: RegExp;
  textTransform: (text: string) => string;
  color: chalk.Chalk;
}

interface HeadingStyle {
  regex: RegExp;
  font: string;
  color: chalk.Chalk;
}

const headingStyles: HeadingStyle[] = [
  { regex: /<h1.*?>(.*?)<\/h1>/g, font: "Standard", color: chalk.magenta },
  { regex: /<h2.*?>(.*?)<\/h2>/g, font: "Slant", color: chalk.yellow },
  { regex: /<h3.*?>(.*?)<\/h3>/g, font: "Small", color: chalk.green },
  { regex: /<h4.*?>(.*?)<\/h4>/g, font: "Mini", color: chalk.blue },
];

const asciiHeadingStyles: ASCIIHeadingStyle[] = [
  {
    regex: /<h1.*?>(.*?)<\/h1>/g,
    textTransform: (text) => text.toUpperCase(),
    color: chalk.yellow,
  },
  {
    regex: /<h2.*?>(.*?)<\/h2>/g,
    textTransform: (text) => text.toUpperCase(),
    color: chalk.yellow.italic,
  },
  {
    regex: /<h3.*?>(.*?)<\/h3>/g,
    textTransform: (text) => text,
    color: chalk.cyan,
  },
  {
    regex: /<h4.*?>(.*?)<\/h4>/g,
    textTransform: (text) => text,
    color: chalk.cyan.italic,
  },
];

const docDir: string = path.join(projectDir_get(), "doc");

/**
 * Determines the root project directory by looking for `package.json`.
 *
 * @returns The absolute path to the project directory.
 */
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

/**
 * Converts AsciiDoc content to HTML.
 *
 * @param content - The AsciiDoc content string.
 * @returns The converted HTML string.
 */
function adoc_toHtml(content: string): string {
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

/**
 * Renders AsciiDoc content to a formatted string for console display.
 *
 * @param content - The AsciiDoc content string.
 * @param style - The rendering style ('figlet' or 'ascii').
 * @param width - Optional width for text wrapping.
 * @returns A Promise resolving to the formatted string.
 */
async function asciidoc_render(
  content: string,
  style: "figlet" | "ascii",
  width?: number,
): Promise<string> {
  let result: string = adoc_toHtml(content);

  const createFiglet = (text: string, font: string): Promise<string> => {
    return new Promise((resolve) => {
      figlet.text(text, { font }, (err, data) => {
        resolve(err ? text : data || text);
      });
    });
  };

  function createASCII(text: string, style: ASCIIHeadingStyle): string {
    const transformedText = style.textTransform(text);
    return style.color(transformedText);
  }

  const processHeading = async (
    text: string,
    style: "figlet" | "ascii",
    figletStyle: HeadingStyle,
    asciiStyle: ASCIIHeadingStyle,
  ): Promise<string> => {
    if (style === "figlet") {
      const figletText = await createFiglet(text, figletStyle.font);
      return figletStyle.color(figletText);
    } else {
      return createASCII(text, asciiStyle);
    }
  };

  // Process headings
  for (let i = 0; i < headingStyles.length; i++) {
    const figletStyle = headingStyles[i];
    const asciiStyle = asciiHeadingStyles[i];
    const matches = result.match(figletStyle.regex) || [];
    for (const match of matches) {
      const text = match
        .replace(/<\/?h[1-4].*?>/g, "")
        .replace(/<a.*?>(.*?)<\/a>/g, "$1");
      const processed = await processHeading(
        text,
        style,
        figletStyle,
        asciiStyle,
      );
      result = result.replace(match, `\n${processed}\n`);
    }
  }

  // Process other elements
  result = result
    .replace(/<code>(.*?)<\/code>/g, (_, p1) => chalk.cyan(p1))
    .replace(/<em>(.*?)<\/em>/g, (_, p1) => chalk.italic(p1))
    .replace(/<\/?div.*?>/g, "")
    .replace(/<p>(.*?)<\/p>/g, "$1\n")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/<a.*?>(.*?)<\/a>/g, "$1")
    .replace(/<\/?[^>]+(>|$)/g, "")
    .replace(/\n{3,}/g, "\n\n") // Replace 3 or more newlines with 2
    .trim();

  // Wrap the result if width is specified
  if (width) {
    result = result
      .split("\n")
      .map((line) => text_wrap(line, width))
      .join("\n");
  }

  return result;
}

/**
 * Opens a local file in the default web browser.
 *
 * @param filePath - The path to the file to open.
 */
function browser_open(filePath: string): void {
  const ascii: ReturnType<typeof asciidoctor> = asciidoctor();
  const tempHtmlPath: string = path.join(
    os.tmpdir(),
    path.basename(filePath).replace(".adoc", ".html"),
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
      error instanceof Error ? error.message : String(error),
    );
  }
}

/**
 * Wraps text to a specified width.
 *
 * @param text - The text to wrap.
 * @param width - The maximum line width.
 * @returns The wrapped text.
 */
function text_wrap(text: string, width: number): string {
  if (!width || width <= 0) return text;

  const words = text.split(" ");
  let wrappedText = "";
  let line = "";

  for (const word of words) {
    if ((line + word).length > width) {
      wrappedText += (wrappedText ? "\n" : "") + line.trim();
      line = "";
    }
    line += word + " ";
  }

  wrappedText += (wrappedText ? "\n" : "") + line.trim();
  return wrappedText;
}

/**
 * Lists available manual page topics from the documentation directory.
 *
 * @returns A Promise resolving to an array of formatted topic names.
 */
export async function topics_list(): Promise<string[]> {
  library.add(faBook);
  const bookIcon = "";
  const files: string[] = fs.readdirSync(docDir);
  const adocFiles: string[] = files.filter(
    (file: string) => path.extname(file) === ".adoc",
  );
  const formattedOutput: string[] = adocFiles.map(
    (file: string) => `${bookIcon} ${path.basename(file, ".adoc")}`,
  );
  return formattedOutput;
}

/**
 * Handles the display of a manpage, either in the console or a browser.
 *
 * @param options - ManPageOptions containing topic, browser flag, style, and width.
 */
async function manpage_handle(options: ManPageOptions): Promise<void> {
  const docPath: string = path.join(docDir, `${options.topic}.adoc`);

  if (!fs.existsSync(docPath)) {
    console.error(`Documentation for '${options.topic}' not found.`);
    return;
  }

  if (options.browser) {
    browser_open(docPath);
  } else {
    const content: string = fs.readFileSync(docPath, "utf-8");
    console.log(await asciidoc_render(content, options.style, options.width));
  }
}

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