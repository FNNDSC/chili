"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listDirContents = listDirContents;
exports.createDir = createDir;
exports.createFile = createFile;
exports.setupLfsCommand = setupLfsCommand;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
async function listDirContents(filepath) {
    try {
        const files = await fs.promises.readdir(filepath);
        const detailedFilesPromises = files.map(async (file) => {
            let fileDetails = await fs.promises.lstat(path.resolve(filepath, file));
            const { size, birthtime } = fileDetails;
            return { filename: file, "size(KB)": size, created_at: birthtime };
        });
        const detailedFiles = await Promise.all(detailedFilesPromises);
        console.table(detailedFiles);
    }
    catch (error) {
        console.error("Error occurred while reading the directory!", error);
    }
}
function createDir(filepath) {
    if (!fs.existsSync(filepath)) {
        fs.mkdirSync(filepath);
        console.log("The directory has been created successfully");
    }
}
function createFile(filepath) {
    fs.openSync(filepath, "w");
    console.log("An empty file has been created");
}
function setupLfsCommand(program) {
    const lfs = program.command('lfs')
        .description('Local filesystem operations');
    lfs.command('ls [directory]')
        .description('List directory contents')
        .action(async (directory = process.cwd()) => {
        await listDirContents(directory);
    });
    lfs.command('mkdir <directory>')
        .description('Create a directory')
        .action((directory) => {
        createDir(path.resolve(process.cwd(), directory));
    });
    lfs.command('touch <file>')
        .description('Create a file')
        .action((file) => {
        createFile(path.resolve(process.cwd(), file));
    });
}
