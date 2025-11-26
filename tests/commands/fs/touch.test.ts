import { files_touch } from '../../../src/commands/fs/touch';
import { files_touch as salsaFiles_touch } from '@fnndsc/salsa';

jest.mock('@fnndsc/salsa');

describe('fs touch command', () => {
  it('should call salsa files_touch', async () => {
    (salsaFiles_touch as jest.Mock).mockResolvedValue(true);
    const result = await files_touch('/some/path');
    expect(salsaFiles_touch).toHaveBeenCalledWith('/some/path');
    expect(result).toBe(true);
  });
});
