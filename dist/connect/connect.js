"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupConnectCommand = setupConnectCommand;
// import Client, { Feed } from '@fnndsc/chrisapi';
const chrisapi_1 = __importDefault(require("@fnndsc/chrisapi"));
async function connectToChRIS(options) {
    const { user, password, url } = options;
    const authUrl = url + 'auth-token/';
    console.log(`Connecting to ${url} with user ${user}`);
    try {
        const authToken = await chrisapi_1.default.getAuthToken(authUrl, user, password);
        if (authToken) {
            console.log('Token received successfully');
            console.log('Token: ', authToken);
            console.log('Connected successfully!');
        }
        else {
            console.log('Failed to receive auth token');
        }
    }
    catch (error) {
        console.error('Error during connection:', error);
        throw error;
    }
}
function setupConnectCommand(program) {
    program
        .command('connect')
        .description('Connect to a ChRIS instance')
        .requiredOption('--user <user>', 'Username for authentication')
        .requiredOption('--password <password>', 'Password for authentication')
        .argument('<url>', 'URL of the ChRIS instance')
        .action(async (url, options) => {
        try {
            await connectToChRIS({
                user: options.user,
                password: options.password,
                url: url
            });
        }
        catch (error) {
            console.error('Failed to connect:', error);
        }
    });
}
