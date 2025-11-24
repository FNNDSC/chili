import { plugins_search, plugins_doDelete } from '../../../src/commands/plugins/delete';
import * as salsa from '@fnndsc/salsa';

jest.mock('@fnndsc/salsa');

describe('commands/plugins/delete', () => {
  describe('plugins_search', () => {
    it('should call salsa.plugins_list', async () => {
      (salsa.plugins_list as jest.Mock).mockResolvedValue({ tableData: [] });
      await plugins_search('name:test');
      expect(salsa.plugins_list).toHaveBeenCalled();
    });
  });

  describe('plugins_doDelete', () => {
    it('should call salsa.plugin_delete', async () => {
      (salsa.plugin_delete as jest.Mock).mockResolvedValue(true);
      await plugins_doDelete(1);
      expect(salsa.plugin_delete).toHaveBeenCalledWith(1);
    });
  });
});
