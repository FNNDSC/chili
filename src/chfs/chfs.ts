import * as fs from 'fs';
import * as path from 'path';

export function listDir(dirPath: string) {
  return fs.readdirSync(dirPath);
}

export function createDir(dirPath: string) {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function createFile(filePath: string) {
  fs.writeFileSync(filePath, '');
}


