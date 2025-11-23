import { path_resolve_chrisfs, CLIoptions } from '../src/utils/cli';
import { chrisContext, Context } from '@fnndsc/cumin';

jest.mock('@fnndsc/cumin');

describe('path_resolve_chrisfs', () => {
  const mockCurrentContext = '/default/context';

  beforeEach(() => {
    jest.clearAllMocks();
    (chrisContext.current_get as jest.Mock).mockResolvedValue(mockCurrentContext);
  });

  it('should resolve an absolute path from fileIdentifier', async () => {
    const fileIdentifier = '/abs/path/file.txt';
    const options: CLIoptions = {};
    const result = await path_resolve_chrisfs(fileIdentifier, options);
    expect(result).toBe('/abs/path/file.txt');
    expect(chrisContext.current_get).not.toHaveBeenCalled(); // Should not need context
  });

  it('should resolve a relative path from fileIdentifier against current context', async () => {
    const fileIdentifier = 'relative/file.txt';
    const options: CLIoptions = {};
    const result = await path_resolve_chrisfs(fileIdentifier, options);
    expect(result).toBe('/default/context/relative/file.txt');
    expect(chrisContext.current_get).toHaveBeenCalledWith(Context.ChRISfolder);
  });

  it('should resolve a filename from fileIdentifier against current context', async () => {
    const fileIdentifier = 'file.txt';
    const options: CLIoptions = {};
    const result = await path_resolve_chrisfs(fileIdentifier, options);
    expect(result).toBe('/default/context/file.txt');
    expect(chrisContext.current_get).toHaveBeenCalledWith(Context.ChRISfolder);
  });

  it('should resolve using --path and filename from fileIdentifier', async () => {
    const fileIdentifier = 'file.txt';
    const options: CLIoptions = { path: '/explicit/path' };
    const result = await path_resolve_chrisfs(fileIdentifier, options);
    expect(result).toBe('/explicit/path/file.txt');
    expect(chrisContext.current_get).not.toHaveBeenCalled();
  });

  it('should resolve using --path and --name', async () => {
    const options: CLIoptions = { path: '/explicit/path', name: 'explicit_name.txt' };
    const result = await path_resolve_chrisfs(undefined, options);
    expect(result).toBe('/explicit/path/explicit_name.txt');
    expect(chrisContext.current_get).not.toHaveBeenCalled();
  });

  it('should resolve using current context and --name', async () => {
    const options: CLIoptions = { name: 'explicit_name.txt' };
    const result = await path_resolve_chrisfs(undefined, options);
    expect(result).toBe('/default/context/explicit_name.txt');
    expect(chrisContext.current_get).toHaveBeenCalledWith(Context.ChRISfolder);
  });

  it('should prioritize fileIdentifier absolute path over --path and --name', async () => {
    const fileIdentifier = '/abs/path/override.txt';
    const options: CLIoptions = { path: '/ignore/this', name: 'ignore.txt' };
    const result = await path_resolve_chrisfs(fileIdentifier, options);
    expect(result).toBe('/abs/path/override.txt');
    expect(chrisContext.current_get).not.toHaveBeenCalled(); // It will call get, even if it ignores baseDir
  });

  it('should prioritize --path over current context for relative fileIdentifier', async () => {
    const fileIdentifier = 'myfile.txt';
    const options: CLIoptions = { path: '/custom/base' };
    const result = await path_resolve_chrisfs(fileIdentifier, options);
    expect(result).toBe('/custom/base/myfile.txt');
    expect(chrisContext.current_get).not.toHaveBeenCalled();
  });

  it('should throw error if no filename can be determined', async () => {
    const options: CLIoptions = { path: '/some/path' }; // Missing fileIdentifier and name
    await expect(path_resolve_chrisfs(undefined, options)).rejects.toThrow('Cannot resolve file path: no filename or path fragment provided.');
  });

  it('should handle root context correctly', async () => {
    (chrisContext.current_get as jest.Mock).mockResolvedValue(''); // Empty string often means root
    const fileIdentifier = 'root_file.txt';
    const options: CLIoptions = {};
    const result = await path_resolve_chrisfs(fileIdentifier, options);
    expect(result).toBe('/root_file.txt');
  });
});
