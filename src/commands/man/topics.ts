import fs from "fs";
import path from "path";
import { projectDir_get } from "../../man/renderer";
import { library } from "@fortawesome/fontawesome-svg-core";
import { faBook } from "@fortawesome/free-solid-svg-icons";

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
