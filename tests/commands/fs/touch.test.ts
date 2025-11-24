import { files_touch_do } from '../../../src/commands/fs/touch';
import * as salsa from '@fnndsc/salsa';

jest.mock('@fnndsc/salsa');

describe('commands/fs/touch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (salsa.files_touch as jest.Mock).mockResolvedValue(true); // Default mock for success
  });

  it('should call salsa.files_touch with the correct path and return true on success', async () => {
    const filePath = '/test/new_file.txt';
    const result = await files_touch_do(filePath);

    expect(salsa.files_touch).toHaveBeenCalledWith(filePath);
    expect(result).toBe(true);
  });

  it('should return false if salsa.files_touch fails', async () => {
    (salsa.files_touch as jest.Mock).mockResolvedValue(false); // Simulate failure
    const filePath = '/test/failed_file.txt';
    const result = await files_touch_do(filePath);

    expect(salsa.files_touch).toHaveBeenCalledWith(filePath);
    expect(result).toBe(false);
  });
});
