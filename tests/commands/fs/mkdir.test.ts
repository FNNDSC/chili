import { files_mkdir } from '../../../src/commands/fs/mkdir';
import { files_mkdir as salsaFiles_mkdir } from '@fnndsc/salsa';

jest.mock('@fnndsc/salsa');

describe('fs mkdir command', () => {
  it('should call salsa files_mkdir', async () => {
    (salsaFiles_mkdir as jest.Mock).mockResolvedValue(true);
    const result = await files_mkdir('/some/path');
    expect(salsaFiles_mkdir).toHaveBeenCalledWith('/some/path');
    expect(result).toBe(true);
  });
});
