/**
 * @file Implements the logic for listing available documentation topics.
 *
 * This module scans the documentation directory and returns a list
 * of available topics (Asciidoc files).
 *
 * @module
 */
import fs from "fs";
import path from "path";
import { projectDir_get } from "../../man/renderer.js";
import { library } from "@fortawesome/fontawesome-svg-core";
import { faBook } from "@fortawesome/free-solid-svg-icons";

/**
 * Lists the available documentation topics.
 *
 * @returns A Promise resolving to an array of topic strings (filenames without extension).
 */
export async function topics_list(): Promise<string[]> {
  const docDir: string = path.join(projectDir_get(), "doc");
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
