import { Command } from 'commander';
import { FeedMemberHandler } from '../src/feeds/feedHandler';
import { SimpleRecord } from '@fnndsc/cumin';
import * as feedCreateCmd from '../src/commands/feed/create';

// Mock the command implementation
jest.mock('../src/commands/feed/create');

describe('feed create command', () => {
  let program: Command;
  let feedMemberHandler: FeedMemberHandler;

  beforeEach(() => {
    program = new Command();
    feedMemberHandler = new FeedMemberHandler();
    feedMemberHandler.feedCommand_setup(program);
    jest.clearAllMocks();
  });

  it('should call feed_create_do with correct options', async () => {
    const mockFeedInfo: SimpleRecord = {
      pluginInstance: { data: { id: 100 } },
      id: 200,
      name: 'test-feed',
      owner_username: 'testuser',
      // Mock other necessary properties if SimpleRecord expects them
    };
    const mockFeedCreateDo = jest.spyOn(feedCreateCmd, 'feed_doCreate');
    mockFeedCreateDo.mockResolvedValue(mockFeedInfo);

    const dirs = '/path/to/data';
    const params = 'title:MyFeed,cpu_limit:1000';
    
    await program.parseAsync([
      'node',
      'chili',
      'feed',
      'create',
      '--dirs',
      dirs,
      '--params',
      params,
    ]);

    expect(mockFeedCreateDo).toHaveBeenCalledTimes(1);
    expect(mockFeedCreateDo).toHaveBeenCalledWith(
      expect.objectContaining({
        dirs: dirs,
        params: params,
      })
    );
  });
});
