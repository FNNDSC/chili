import { Command } from 'commander';
import { FeedMemberHandler } from '../src/feeds/feedHandler';
import { ChRISFeed } from '@fnndsc/cumin';

// Mock the cumin module's ChRISFeed class
const mockCreateFromDirs = jest.fn();
jest.mock('@fnndsc/cumin', () => ({
  ...jest.requireActual('@fnndsc/cumin'),
  ChRISFeed: jest.fn().mockImplementation(() => {
    return {
      createFromDirs: mockCreateFromDirs,
    };
  }),
}));

describe('feed create command', () => {
  let program: Command;
  let feedMemberHandler: FeedMemberHandler;

  beforeEach(() => {
    program = new Command();
    feedMemberHandler = new FeedMemberHandler();
    feedMemberHandler.feedCommand_setup(program);
    mockCreateFromDirs.mockClear();
  });

  it('should call createFromDirs with correct parameters', async () => {
    mockCreateFromDirs.mockResolvedValue({
      pluginInstance: { data: { id: 100 } },
      id: 200,
      name: 'test-feed',
      owner_username: 'testuser',
    });

    const dirs = 'chris/user/data';
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

    expect(mockCreateFromDirs).toHaveBeenCalledTimes(1);
    expect(mockCreateFromDirs).toHaveBeenCalledWith(
      dirs,
      expect.objectContaining({
        params: params,
      })
    );
  });
});
