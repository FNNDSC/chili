import { files_doTouch } from '../../../src/commands/fs/touch';
import * as salsa from '@fnndsc/salsa';

jest.mock('@fnndsc/salsa');

describe('commands/fs/touch', () => {
  it('should call salsa.files_touch', async () => {
    (salsa.files_touch as jest.Mock).mockResolvedValue(true);
    
    const result = await files_doTouch('/path/file.txt');

    expect(salsa.files_touch).toHaveBeenCalledWith('/path/file.txt');
    expect(result).toBe(true);
  });
});
