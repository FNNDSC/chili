import { Command } from 'commander';
import { chrisConnection } from './chrisConnection';

export function setupConnectCommand(program: Command): void {
  program
    .command('connect')
    .description('Connect to a ChRIS instance')
    .requiredOption('--user <user>', 'Username for authentication')
    .requiredOption('--password <password>', 'Password for authentication')
    .argument('<url>', 'URL of the ChRIS instance')
    .action(async (url, options) => {
      try {
        await chrisConnection.connect({
          user: options.user,
          password: options.password,
          url: url
        });
      } catch (error) {
        console.error('Failed to connect:', error);
      }
    });

  program
    .command('logout')
    .description('Log out from ChRIS')
    .action(() => {
      chrisConnection.logout();
    });
}


//
// import { Command } from 'commander';
// import { chrisConnection } from './chrisConnection';
//
// export function setupConnectCommand(program: Command): void {
//   program
//     .command('connect')
//     .description('Connect to a ChRIS instance')
//     .requiredOption('--user <user>', 'Username for authentication')
//     .requiredOption('--password <password>', 'Password for authentication')
//     .argument('<url>', 'URL of the ChRIS instance')
//     .action(async (url, options) => {
//       try {
//         await chrisConnection.connect({
//           user: options.user,
//           password: options.password,
//           url: url
//         });
//       } catch (error) {
//         console.error('Failed to connect:', error);
//       }
//     });
// }
//


// import { Command } from 'commander';
// // import Client, { Feed } from '@fnndsc/chrisapi';
// import Client from '@fnndsc/chrisapi';
//
// interface ConnectOptions {
//   user: string;
//   password: string;
//   url: string;
// }
//
// async function connectToChRIS(options: ConnectOptions): Promise<void> {
//   const { user, password, url }: ConnectOptions = options;
//   const authUrl: string = url + 'auth-token/';
//   
//   console.log(`Connecting to ${url} with user ${user}`);
//
//   try {
//     const authToken: string = await Client.getAuthToken(authUrl, user, password);
//     if (authToken) {
//       console.log('Token received successfully');
//       console.log('Token: ', authToken);
//       console.log('Connected successfully!');
//     } else {
//       console.log('Failed to receive auth token');
//     }
//   } catch (error) {
//     console.error('Error during connection:', error);
//     throw error;
//   }
// }
//
// export function setupConnectCommand(program: Command): void {
//   program
//     .command('connect')
//     .description('Connect to a ChRIS instance')
//     .requiredOption('--user <user>', 'Username for authentication')
//     .requiredOption('--password <password>', 'Password for authentication')
//     .argument('<url>', 'URL of the ChRIS instance')
//     .action(async (url, options) => {
//       try {
//         await connectToChRIS({
//           user: options.user,
//           password: options.password,
//           url: url
//         });
//       } catch (error) {
//         console.error('Failed to connect:', error);
//       }
//     });
// }
//
