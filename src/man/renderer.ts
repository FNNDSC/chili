import fs from "fs";
import path from "path";
import chalk from "chalk";
import asciidoctor from "asciidoctor";
import { exec, ExecException } from "child_process";
import url from "url";
import os from "os";

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

/**
 * Determines the root project directory by looking for `package.json`.
 *
 * @returns The absolute path to the project directory.
 */
export function projectDir_get(): string {
  // Fallback for tests and dev environment
  let directoryToCheck: string | null = process.cwd();
  while (directoryToCheck) {
    const packageJsonPath: string = path.join(directoryToCheck, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      return directoryToCheck;
    }
    const parent = path.dirname(directoryToCheck);
    if (parent === directoryToCheck) break; // Root reached
    directoryToCheck = parent;
  }
  return process.cwd();
}

/**
 * Converts AsciiDoc content to HTML.
 *
 * @param content - The AsciiDoc content string.
 * @returns The converted HTML string.
 */
function adoc_HTMLconvert(content: string): string {
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
 * Renders AsciiDoc content to a formatted string for console display.
 *
 * @param content - The AsciiDoc content string.
 * @param style - The rendering style ('figlet' or 'ascii').
 * @param width - Optional width for text wrapping.
 * @returns A Promise resolving to the formatted string.
 */
export async function asciidoc_render(
  content: string,
  style: "figlet" | "ascii",
  width?: number,
): Promise<string> {
  let result: string = adoc_HTMLconvert(content);

  function ASCII_create(text: string, style: ASCIIHeadingStyle): string {
    const transformedText = style.textTransform(text);
    return style.color(transformedText);
  }

  const heading_process = async (
    text: string,
    style: "figlet" | "ascii",
    figletStyle: HeadingStyle,
    asciiStyle: ASCIIHeadingStyle,
  ): Promise<string> => {
    if (style === "figlet") {
      // Fallback to simple color as figlet is disabled in this environment
      return figletStyle.color(text);
    } else {
      return ASCII_create(text, asciiStyle);
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
      const processed = await heading_process(
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
    .replace(/<\/div.*?>/g, "")
    .replace(/<p>(.*?)<\/p>/g, "$1\n")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/<a.*?>(.*?)<\/a>/g, "$1")
    .replace(/<\/?(?!a)[^>]+(>|$)/g, "")
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
export function browser_open(filePath: string): void {
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