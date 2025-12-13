import { files_viewContent } from '../../../src/commands/file/view';
import * as salsa from '@fnndsc/salsa';

jest.mock('@fnndsc/salsa');

describe('commands/file/view', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call salsa.fileContent_get and return content on success', async () => {
    (salsa.fileContent_get as jest.Mock).mockResolvedValue({ ok: true, value: 'file content' });

    const result = await files_viewContent('/path/to/file.txt');

    expect(salsa.fileContent_get).toHaveBeenCalledWith('/path/to/file.txt');
    expect(result).toBe('file content');
  });

  it('should call salsa.fileContent_get with file path', async () => {
    (salsa.fileContent_get as jest.Mock).mockResolvedValue({ ok: true, value: 'content from path' });

    const result = await files_viewContent('/home/user/test.txt');

    expect(salsa.fileContent_get).toHaveBeenCalledWith('/home/user/test.txt');
    expect(result).toBe('content from path');
  });

  it('should throw error if salsa.fileContent_get returns not ok', async () => {
    (salsa.fileContent_get as jest.Mock).mockResolvedValue({ ok: false, error: 'File not found' });

    await expect(files_viewContent('/missing/file.txt')).rejects.toThrow('Failed to view content for: /missing/file.txt');
    expect(salsa.fileContent_get).toHaveBeenCalledWith('/missing/file.txt');
  });

  it('should throw error if salsa.fileContent_get fails', async () => {
    (salsa.fileContent_get as jest.Mock).mockResolvedValue({ ok: false, error: 'Network error' });

    await expect(files_viewContent('789')).rejects.toThrow('Failed to view content for: 789');
    expect(salsa.fileContent_get).toHaveBeenCalledWith('789');
  });
});
