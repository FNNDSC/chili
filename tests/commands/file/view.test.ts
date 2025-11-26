import { files_viewContent } from '../../../src/commands/file/view';
import * as salsa from '@fnndsc/salsa';
import * as fileListCmd from '../../../src/commands/files/list';

jest.mock('@fnndsc/salsa');
jest.mock('../../../src/commands/files/list');

describe('commands/file/view', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call salsa.files_view with ID directly if numeric', async () => {
    (salsa.files_view as jest.Mock).mockResolvedValue(Buffer.from('content'));

    const result = await files_viewContent('123');

    expect(salsa.files_view).toHaveBeenCalledWith(123);
    expect(result).toBe('content');
  });

  it('should resolve name to ID and call salsa.files_view', async () => {
    (fileListCmd.files_fetchList as jest.Mock).mockResolvedValue({
      tableData: [{ id: 456, fname: 'test.txt' }]
    });
    (salsa.files_view as jest.Mock).mockResolvedValue(Buffer.from('text content'));

    const result = await files_viewContent('test.txt');

    expect(fileListCmd.files_fetchList).toHaveBeenCalledWith({ search: 'test.txt' }, 'files');
    expect(salsa.files_view).toHaveBeenCalledWith(456);
    expect(result).toBe('text content');
  });

  it('should throw error if file not found', async () => {
    (fileListCmd.files_fetchList as jest.Mock).mockResolvedValue({ tableData: [] });

    await expect(files_viewContent('missing.txt')).rejects.toThrow('File not found: missing.txt');
  });

  it('should return null if salsa.files_view returns null', async () => {
    (salsa.files_view as jest.Mock).mockResolvedValue(null);

    const result = await files_viewContent('789');

    expect(result).toBeNull();
  });
});
