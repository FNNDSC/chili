import { Command } from 'commander';
import { connectCommand_setup } from '../src/connect/connectHandler';
import { chrisConnection } from '@fnndsc/cumin';

// Mock the cumin module
jest.mock('@fnndsc/cumin', () => ({
  ...jest.requireActual('@fnndsc/cumin'),
  chrisConnection: {
    connection_connect: jest.fn(),
  },
}));

describe('connect command', () => {
  let program: Command;
  const mockedConnect = chrisConnection.connection_connect as jest.Mock;

  beforeEach(() => {
    program = new Command();
    connectCommand_setup(program);
    mockedConnect.mockClear();
  });

  it('should call connection_connect with correct parameters', async () => {
    const url = 'http://localhost:8000/api/v1/';
    const user = 'testuser';
    const password = 'testpassword';
    
    await program.parseAsync([
      'node',
      'chili',
      'connect',
      url,
      '--user',
      user,
      '--password',
      password,
    ]);

    expect(mockedConnect).toHaveBeenCalledTimes(1);
    expect(mockedConnect).toHaveBeenCalledWith({
      user: user,
      password: password,
      url: url,
      debug: false,
    });
  });

  it('should call connection_connect with debug flag if provided', async () => {
    const url = 'http://localhost:8000/api/v1/';
    const user = 'testuser';
    const password = 'testpassword';
    
    await program.parseAsync([
      'node',
      'chili',
      'connect',
      url,
      '--user',
      user,
      '--password',
      password,
      '--debug',
    ]);

    expect(mockedConnect).toHaveBeenCalledTimes(1);
    expect(mockedConnect).toHaveBeenCalledWith({
      user: user,
      password: password,
      url: url,
      debug: true,
    });
  });
});
