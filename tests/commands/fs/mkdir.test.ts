import { files_doMkdir } from '../../../src/commands/fs/mkdir';
import * as salsa from '@fnndsc/salsa';

jest.mock('@fnndsc/salsa');

describe('commands/fs/mkdir', () => {
  it('should call salsa.files_mkdir', async () => {
    (salsa.files_mkdir as jest.Mock).mockResolvedValue(true);
    
    const result = await files_doMkdir('/path/dir');

    expect(salsa.files_mkdir).toHaveBeenCalledWith('/path/dir');
    expect(result).toBe(true);
  });
});
