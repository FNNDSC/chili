import fs from "fs";
import path from "path";
import { projectDir_get, browser_open, asciidoc_render } from "../../man/renderer";

export interface ManPageOptions {
  topic: string;
  browser?: boolean;
  style: "figlet" | "ascii";
  width?: number;
}

export async function manpage_handle(options: ManPageOptions): Promise<void> {
  const docDir: string = path.join(projectDir_get(), "doc");
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
