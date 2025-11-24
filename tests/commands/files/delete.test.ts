import { files_search, files_doDelete } from '../../../src/commands/files/delete';
import * as salsa from '@fnndsc/salsa';

jest.mock('@fnndsc/salsa');

describe('files delete commands', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('files_search', () => {
    it('should call salsa.files_list and return data', async () => {
      const mockData = [{ id: 1, fname: 'test.txt' }];
      (salsa.files_list as jest.Mock).mockResolvedValue({
        tableData: mockData
      });

      const result = await files_search('fname:test.txt', 'files');
      
      expect(salsa.files_list).toHaveBeenCalled();
      expect(result).toEqual(mockData);
    });
  });

  describe('files_doDelete', () => {
    it('should call salsa.files_delete', async () => {
      (salsa.files_delete as jest.Mock).mockResolvedValue(true);
      
      const result = await files_doDelete(123, 'files');
      
      expect(salsa.files_delete).toHaveBeenCalledWith(123, 'files');
      expect(result).toBe(true);
    });
  });
});
