import { Command } from 'commander';
import { PluginMemberHandler, PluginGroupHandler } from '../src/plugins/pluginHandler';
import { errorStack } from '@fnndsc/cumin';
import * as salsa from '@fnndsc/salsa';
import * as child_process from 'child_process';

// Mock salsa
jest.mock('@fnndsc/salsa');

// Mock child_process to intercept Docker calls
jest.mock('child_process');

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

  it('add command should orchestrate docker and register plugin', async () => {
    // Mock exec to simulate Docker behavior
    (child_process.exec as unknown as jest.Mock).mockImplementation((cmd, callback) => {
      if (cmd.includes('docker info')) {
        callback(null, 'OK', '');
      } else if (cmd.includes('docker pull')) {
        callback(null, 'Status: Downloaded newer image', '');
      } else if (cmd.includes('chris_plugin_info')) {
        callback(null, JSON.stringify({ name: 'pl-mock', dock_image: 'mock/image' }), '');
      } else {
        callback(new Error('Unknown command'), '', 'Error');
      }
    });

    const mockRegister = jest.spyOn(salsa, 'plugin_register');
    mockRegister.mockResolvedValue({ id: 1, name: 'pl-mock' });

    await program.parseAsync([
      'node',
      'chili',
      'plugins',
      'add',
      'mock/image',
      '--public_repo', 'http://repo',
      '--compute', 'local'
    ]);

    expect(child_process.exec).toHaveBeenCalledWith(expect.stringContaining('docker pull'), expect.any(Function));
    expect(child_process.exec).toHaveBeenCalledWith(expect.stringContaining('chris_plugin_info'), expect.any(Function));
    
    expect(mockRegister).toHaveBeenCalledWith(
      expect.objectContaining({ 
        name: 'pl-mock', 
        dock_image: 'mock/image',
        public_repo: 'http://repo' 
      }),
      ['local']
    );
  });
});