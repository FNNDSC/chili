// feed.ts

import { Command } from 'commander';
import { chrisConnection } from '../connect/chrisConnection.js';
import Client from '@fnndsc/chrisapi';

async function listFeeds(): Promise<void> {
  const authToken = chrisConnection.getAuthToken();
  if (!authToken) {
    console.log('Not connected to ChRIS. Please connect first using the connect command.');
    return;
  }

  try {
    const client = new Client(authToken);
    const feeds = await client.getFeeds();
    console.log('Feeds:', feeds);
  } catch (error) {
    console.error('Error listing feeds:', error);
  }
}

async function createFeed(feedName: string): Promise<void> {
  const authToken = chrisConnection.getAuthToken();
  if (!authToken) {
    console.log('Not connected to ChRIS. Please connect first using the connect command.');
    return;
  }

  try {
    const client = new Client(authToken);
    const newFeed = await client.createFeed(feedName);
    console.log('New feed created:', newFeed);
  } catch (error) {
    console.error('Error creating feed:', error);
  }
}

async function addDataToFeed(data: string): Promise<void> {
  const authToken = chrisConnection.getAuthToken();
  if (!authToken) {
    console.log('Not connected to ChRIS. Please connect first using the connect command.');
    return;
  }

  try {
    const client = new Client(authToken);
    // Assuming there's a method to add data to the most recent feed
    // You might need to adjust this based on the actual API
    const updatedFeed = await client.addDataToLatestFeed(data);
    console.log('Data added to feed:', updatedFeed);
  } catch (error) {
    console.error('Error adding data to feed:', error);
  }
}

export function setupFeedCommand(program: Command): void {
  const feedCommand = program
    .command('feed')
    .description('Interact with ChRIS feeds');

  feedCommand
    .option('-l, --list', 'List all feeds')
    .option('-n, --new <feedName>', 'Create a new feed')
    .option('-d, --data <data>', 'Add data to the feed')
    .action(async (options) => {
      if (options.list) {
        await listFeeds();
      } else if (options.new) {
        await createFeed(options.new);
      } else if (options.data) {
        await addDataToFeed(options.data);
      } else {
        console.log('Please specify an action: --list, --new <feedName>, or --data <data>');
      }
    });
}


