import { files_create_do } from '../../../src/commands/fs/create';
import * as salsa from '@fnndsc/salsa';
import { path_resolve_chrisfs, CLIoptions } from '../../../src/utils/cli';
import * as fs from 'fs';

jest.mock('@fnndsc/salsa');
jest.mock('../../../src/utils/cli');
jest.mock('fs');

describe('commands/fs/create', () => {
  const mockResolvedPath = '/resolved/path/to/file.txt';

  beforeEach(() => {
    jest.clearAllMocks();
    (salsa.files_create as jest.Mock).mockResolvedValue(true); // Default success for files_create
    (path_resolve_chrisfs as jest.Mock).mockResolvedValue(mockResolvedPath); // Default resolved path
    (fs.existsSync as jest.Mock).mockReturnValue(true); // Default local file exists
    (fs.readFileSync as jest.Mock).mockReturnValue(Buffer.from('local file content')); // Default local file content
  });

  it('should throw error if no fileIdentifier or name is provided', async () => {
    const options: CLIoptions = {};
    await expect(files_create_do(undefined, options)).rejects.toThrow('Filename or path is required.');
  });

  it('should throw error if both --content and --from-file are used', async () => {
    const options: CLIoptions = { content: 'test', fromFile: 'local.txt' };
    await expect(files_create_do('file.txt', options)).rejects.toThrow('Cannot use both --content and --from-file. Please choose one.');
  });

  it('should call files_create with string content and resolved path', async () => {
    const options: CLIoptions = { content: 'hello' };
    const result = await files_create_do('file.txt', options);

    expect(path_resolve_chrisfs).toHaveBeenCalledWith('file.txt', options);
    expect(salsa.files_create).toHaveBeenCalledWith('hello', mockResolvedPath);
    expect(result).toBe(true);
  });

  it('should call files_create with Buffer content from local file and resolved path', async () => {
    const options: CLIoptions = { fromFile: 'local.txt' };
    const result = await files_create_do('file.txt', options);

    expect(path_resolve_chrisfs).toHaveBeenCalledWith('file.txt', options);
    expect(fs.existsSync).toHaveBeenCalledWith('local.txt');
    expect(fs.readFileSync).toHaveBeenCalledWith('local.txt');
    expect(salsa.files_create).toHaveBeenCalledWith(Buffer.from('local file content'), mockResolvedPath);
    expect(result).toBe(true);
  });

  it('should call files_create with empty content if neither --content nor --from-file are used', async () => {
    const options: CLIoptions = {};
    const result = await files_create_do('file.txt', options);

    expect(path_resolve_chrisfs).toHaveBeenCalledWith('file.txt', options);
    expect(salsa.files_create).toHaveBeenCalledWith('', mockResolvedPath);
    expect(result).toBe(true);
  });

  it('should throw an error if files_create returns false', async () => {
    (salsa.files_create as jest.Mock).mockResolvedValue(false);
    const options: CLIoptions = { content: 'fail' };
    await expect(files_create_do('file.txt', options)).rejects.toThrow();
  });

  it('should throw error if local file not found', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    const options: CLIoptions = { fromFile: 'nonexistent.txt' };
    await expect(files_create_do('file.txt', options)).rejects.toThrow('Local file not found at nonexistent.txt');
  });

  it('should re-throw errors from files_create with an "Error creating file" prefix', async () => {
    (salsa.files_create as jest.Mock).mockRejectedValue(new Error('Salsa error'));
    const options: CLIoptions = { content: 'error content' };
    await expect(files_create_do('file.txt', options)).rejects.toThrow('Error creating file: Salsa error');
  });

  it('should pass fileIdentifier and options correctly to path_resolve_chrisfs', async () => {
    const fileIdentifier = 'my_file.txt';
    const options: CLIoptions = { path: '/temp', name: 'temp_name.txt', content: 'c' };
    await files_create_do(fileIdentifier, options);
    expect(path_resolve_chrisfs).toHaveBeenCalledWith(fileIdentifier, options);
  });
});
