#!/usr/bin/env node
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const figlet = __importStar(require("figlet"));
const omelette_1 = __importDefault(require("omelette"));
const program = new commander_1.Command();
console.log(figlet.textSync("chjs"));
const connect_js_1 = require("./connect/connect.js");
const lfs_js_1 = require("./lfs/lfs.js");
program
    .version("1.0.0")
    .description("A CLI for ChRIS");
// Setup the connect subcommand
(0, connect_js_1.setupConnectCommand)(program);
// Setup the lfs subcommand
(0, lfs_js_1.setupLfsCommand)(program);
const completion = (0, omelette_1.default)(`chjs|chjs`);
completion.tree({
    connect: ['--user', '--password'],
    lfs: ['ls', 'mkdir', 'touch'],
    // Add more commands and options as needed
});
completion.init();
if (~process.argv.indexOf('--completion')) {
    completion.setupShellInitFile();
}
// Add any global options here
program
    .option('-v, --verbose', 'Enable verbose output')
    .option('-c, --config <path>', 'Path to config file');
async function main() {
    program.parse(process.argv);
    const options = program.opts();
    // Handle global options
    if (options.verbose) {
        console.log('Verbose mode enabled');
    }
    if (options.config) {
        console.log(`Using config file: ${options.config}`);
        // Here you could load and process the config file
    }
    // You can add any other global async operations here
}
main().catch(error => {
    console.error('An error occurred:', error);
    process.exit(1);
});
