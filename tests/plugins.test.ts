import { Command } from 'commander';
import { PluginMemberHandler, PluginGroupHandler } from '../src/plugins/pluginHandler';
import { errorStack } from '@fnndsc/cumin';
import * as salsa from '@fnndsc/salsa';
import * as pluginsAddCmd from '../src/commands/plugins/add';
import * as pluginsListCmd from '../src/commands/plugins/list';

// Mock salsa
jest.mock('@fnndsc/salsa');

// Mock command implementations
jest.mock('../src/commands/plugins/add');
jest.mock('../src/commands/plugins/list');

// Mock cumin's errorStack specifically if it's used for logging
jest.mock('@fnndsc/cumin', () => ({
  ...jest.requireActual('@fnndsc/cumin'),
  errorStack: {
    messagesOfType_search: jest.fn(),
  },
}));

describe('plugin run command', () => {
  let program: Command;
  let pluginMemberHandler: PluginMemberHandler;
  // Spy on the mocked salsa function
  const mockSalsaPluginRun = jest.spyOn(salsa, 'plugin_run');

  beforeEach(() => {
    program = new Command();
    pluginMemberHandler = new PluginMemberHandler();
    pluginMemberHandler.pluginCommand_setup(program);
    jest.clearAllMocks();
  });

  it('should call salsa.plugin_run with correct searchable and params', async () => {
    mockSalsaPluginRun.mockResolvedValue({ id: 123, name: 'pl-test' });

    const searchable = 'pl-test';
    const params = '--dir . --prefix test-';
    
    await program.parseAsync([
      'node',
      'chili',
      'plugin',
      'run',
      searchable,
      ...params.split(' '),
    ]);

    expect(mockSalsaPluginRun).toHaveBeenCalledTimes(1);
    expect(mockSalsaPluginRun).toHaveBeenCalledWith(
      searchable,
      expect.any(Object) 
    );
  });
});

describe('plugin group commands', () => {
  let program: Command;
  let pluginGroupHandler: PluginGroupHandler;

  beforeEach(() => {
    program = new Command();
    pluginGroupHandler = new PluginGroupHandler();
    pluginGroupHandler.pluginGroupCommand_setup(program);
    jest.clearAllMocks();
  });

  it('add command should call plugins_add', async () => {
    const mockAddDo = jest.spyOn(pluginsAddCmd, 'plugins_add');
    mockAddDo.mockResolvedValue(true);

    await program.parseAsync([
      'node',
      'chili',
      'plugins',
      'add',
      'mock/image',
      '--public_repo', 'http://repo',
      '--compute', 'local'
    ]);

    expect(mockAddDo).toHaveBeenCalledWith('mock/image', expect.objectContaining({
      public_repo: 'http://repo',
      compute: 'local'
    }));
  });

  it('list command should call plugins_doList', async () => {
    const mockListDo = jest.spyOn(pluginsListCmd, 'plugins_doList');
    // Mock return value structure if needed by the handler's display logic
    mockListDo.mockResolvedValue({ tableData: [], selectedFields: [] });

    await program.parseAsync([
      'node',
      'chili',
      'plugins',
      'list',
      '--page', '10'
    ]);

    expect(mockListDo).toHaveBeenCalledWith(expect.objectContaining({
      page: '10'
    }));
  });
});