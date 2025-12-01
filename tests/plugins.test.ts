import { PluginController } from '../src/controllers/pluginController';
import { BaseGroupHandler } from '../src/handlers/baseGroupHandler';

// Mock commander globally
import { Command } from 'commander';
import { PluginMemberHandler, PluginGroupHandler } from '../src/plugins/pluginHandler';
import { errorStack } from '@fnndsc/cumin';
import * as salsa from '@fnndsc/salsa';
import * as pluginsAddCmd from '../src/commands/plugins/add';
import * as pluginsListCmd from '../src/commands/plugins/list';
import * as cumin from '@fnndsc/cumin';

// Mock salsa
jest.mock('@fnndsc/salsa');

// Mock command implementations
jest.mock('../src/commands/plugins/add');
jest.mock('../src/commands/plugins/list');
jest.mock('../src/handlers/baseGroupHandler');


// Mock cumin's errorStack specifically if it's used for logging
jest.mock('@fnndsc/cumin', () => ({
  ...jest.requireActual('@fnndsc/cumin'),
  errorStack: {
    messagesOfType_search: jest.fn(),
  },
  dictionary_fromCLI: jest.fn(),
}));

describe('plugin run command', () => {
  let program: Command;
  let pluginMemberHandler: PluginMemberHandler;
  // Spy on the mocked salsa function
  const mockSalsaPluginRun = jest.spyOn(salsa, 'plugin_run');

  beforeEach(() => {
    program = new Command(); // Use a real Commander Command instance
    const mockChrisObject = {
      asset: { /* mock methods if PluginMemberHandler calls them */ }
    };
    const mockPluginControllerInstance = {
      chrisObject: mockChrisObject,
      plugin_run: jest.fn(), // PluginMemberHandler.plugin_run calls this
      plugin_searchableToIDs: jest.fn(), // PluginMemberHandler.plugin_searchableToIDs calls this
    };
    jest.spyOn(PluginController, 'controller_create').mockReturnValue(mockPluginControllerInstance as any);

    pluginMemberHandler = new PluginMemberHandler();
    pluginMemberHandler.pluginCommand_setup(program);
    jest.clearAllMocks();
  });

  it('should call salsa.plugin_run with correct searchable and params', async () => {
    mockSalsaPluginRun.mockResolvedValue({ id: 123, name: 'pl-test' });
    (cumin.dictionary_fromCLI as jest.Mock).mockReturnValue({ dir: '.', prefix: 'test-' });

    const searchable = 'pl-test';
    const params = '--dir . --prefix test-';
    
    // Call the handler method directly
    await pluginMemberHandler.plugin_run(searchable, params);

    expect(mockSalsaPluginRun).toHaveBeenCalledTimes(1);
    expect(mockSalsaPluginRun).toHaveBeenCalledWith(
      searchable,
      { dir: '.', prefix: 'test-' }
    );
  });
});

describe('plugin group commands', () => {
  let program: Command;
  let pluginGroupHandler: PluginGroupHandler;
  let mockBaseGroupHandler: jest.Mocked<BaseGroupHandler>;
  let mockPluginController: { chrisObject: { asset: { resources_listAndFilterByOptions: jest.Mock, resourceItem_delete: jest.Mock, resourceFields_get: jest.Mock } } };

  beforeEach(() => {
    jest.clearAllMocks(); // Clear all mocks before setup

    program = new Command(); // Use a real Commander Command instance
    jest.spyOn(program, 'command').mockImplementation((name: string) => {
      const subcommand = new Command(name);
      // Mock methods needed on the subcommand returned by program.command()
      subcommand.description = jest.fn().mockReturnThis();
      subcommand.addCommand = jest.fn().mockReturnThis();
      subcommand.option = jest.fn().mockReturnThis();
      subcommand.action = jest.fn().mockReturnThis();
      subcommand.allowUnknownOption = jest.fn().mockReturnThis();
      return subcommand;
    });

    // Mock for PluginController
    mockPluginController = {
      chrisObject: {
        asset: {
          resources_listAndFilterByOptions: jest.fn().mockResolvedValue({ plugins: [], selectedFields: [] }),
          resourceItem_delete: jest.fn().mockResolvedValue(true),
          resourceFields_get: jest.fn().mockResolvedValue([]),
        },
      },
    };
    jest.spyOn(PluginController, 'controller_create').mockReturnValue(mockPluginController as any);

    // Mock for BaseGroupHandler
    mockBaseGroupHandler = new (BaseGroupHandler as jest.Mock<BaseGroupHandler>)() as jest.Mocked<BaseGroupHandler>;
    mockBaseGroupHandler.resources_list.mockResolvedValue(undefined); // Mock resources_list to not throw
    mockBaseGroupHandler.baseListCommand_create.mockImplementation((actionHandler) => {
      const mockCmd = new Command('list'); // Create a real Command for the list command
      mockCmd.option = jest.fn().mockReturnThis();
      mockCmd.action = jest.fn((...args) => {
        actionHandler(args[0]); // Ensure the action handler is called
        return mockCmd;
      }).mockReturnThis();
      return mockCmd;
    });
    // Ensure that when BaseGroupHandler is instantiated, it returns our mock
    (BaseGroupHandler as jest.Mock).mockImplementation(() => mockBaseGroupHandler);

    pluginGroupHandler = new PluginGroupHandler();
    pluginGroupHandler.pluginGroupCommand_setup(program);
    jest.clearAllMocks();
  });

  it('add command should call plugin_add', async () => {
    const mockAddDo = jest.spyOn(pluginsAddCmd, 'plugin_add');
    mockAddDo.mockResolvedValue(true);

    const options = { public_repo: 'http://repo', compute: 'local' };
    await pluginGroupHandler.plugins_add('mock/image', options);

    expect(mockAddDo).toHaveBeenCalledWith('mock/image', options);
  });
});