import { files_mkdir_do } from '../../../src/commands/fs/mkdir';
import * as salsa from '@fnndsc/salsa';

jest.mock('@fnndsc/salsa');

describe('commands/fs/mkdir', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (salsa.files_mkdir as jest.Mock).mockResolvedValue(true); // Default mock for success
  });

  it('should call salsa.files_mkdir with the correct path and return true on success', async () => {
    const dirPath = '/test/new_dir';
    const result = await files_mkdir_do(dirPath);

    expect(salsa.files_mkdir).toHaveBeenCalledWith(dirPath);
    expect(result).toBe(true);
  });

  it('should return false if salsa.files_mkdir fails', async () => {
    (salsa.files_mkdir as jest.Mock).mockResolvedValue(false); // Simulate failure
    const dirPath = '/test/failed_dir';
    const result = await files_mkdir_do(dirPath);

    expect(salsa.files_mkdir).toHaveBeenCalledWith(dirPath);
    expect(result).toBe(false);
  });
});
