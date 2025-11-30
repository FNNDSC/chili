import { Command } from 'commander';
import { FileGroupHandler, FileMemberHandler } from '../src/filesystem/fileGroupHandler';
import { errorStack, ChRISEmbeddedResourceGroup } from '@fnndsc/cumin';
import * as salsa from '@fnndsc/salsa';
import * as filesListCmd from '../src/commands/files/list';
import * as fileCreateCmd from '../src/commands/fs/create';

// Mock salsa
jest.mock('@fnndsc/salsa');

// Mock command implementations
jest.mock('../src/commands/files/list');
jest.mock('../src/commands/fs/create');

// Mock cumin's errorStack
jest.mock('@fnndsc/cumin', () => ({
  ...jest.requireActual('@fnndsc/cumin'),
  errorStack: {
    stack_search: jest.fn(() => ['Error message']),
  },
  ChRISEmbeddedResourceGroup: jest.fn().mockImplementation(function() {
    return { folder: '/test' };
  })
}));

// Mock console methods
const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

// Mock salsa file functions
const mockFilesGetGroup = jest.spyOn(salsa, 'files_getGroup');
const mockFilesGetSingle = jest.spyOn(salsa, 'files_getSingle');

describe('file group commands', () => {
  let program: Command;
  let fileGroupHandler: FileGroupHandler;

  beforeEach(async () => {
    // Mock files_getGroup to return a mock ChRIS group object
    mockFilesGetGroup.mockResolvedValue({
      folder: '/test',
      asset: {
        resources_listAndFilterByOptions: jest.fn()
      }
    } as any);

    program = new Command();
    // Use factory method to create handler
    fileGroupHandler = await FileGroupHandler.handler_create('files');
    fileGroupHandler.fileGroupCommand_setup(program);
    jest.clearAllMocks();
  });

  describe('list command', () => {
    it('should call files_fetchList with options', async () => {
      const mockListDo = jest.spyOn(filesListCmd, 'files_fetchList');
      mockListDo.mockResolvedValue({
        tableData: [
          { id: 1, fname: 'test.txt', fsize: 100, owner_username: 'user', creation_date: '2025-01-01' }
        ],
        selectedFields: ['id', 'fname', 'fsize']
      });

      await program.parseAsync([
        'node',
        'chili',
        'files',
        'list',
        '--page', '10',
        '--fields', 'id,fname,fsize'
      ]);

      expect(mockListDo).toHaveBeenCalledWith(
        expect.objectContaining({
          page: '10',
          fields: 'id,fname,fsize'
        }),
        'files',
        undefined // no path argument
      );
    });

    it('should call files_fetchList with path argument', async () => {
      const mockListDo = jest.spyOn(filesListCmd, 'files_fetchList');
      mockListDo.mockResolvedValue({
        tableData: [],
        selectedFields: []
      });

      await program.parseAsync([
        'node',
        'chili',
        'files',
        'list',
        '/home/test',
        '--fields', 'id,fname'
      ]);

      expect(mockListDo).toHaveBeenCalledWith(
        expect.objectContaining({
          fields: 'id,fname'
        }),
        'files',
        '/home/test' // path argument should be passed
      );
    });

    it('should handle all standard list options', async () => {
      const mockListDo = jest.spyOn(filesListCmd, 'files_fetchList');
      mockListDo.mockResolvedValue({
        tableData: [],
        selectedFields: []
      });

      await program.parseAsync([
        'node',
        'chili',
        'files',
        'list',
        '--page', '20',
        '--fields', 'id,fname',
        '--search', 'fname:test',
        '--sort', 'fsize',
        '--reverse',
        '--table'
      ]);

      expect(mockListDo).toHaveBeenCalledWith(
        expect.objectContaining({
          page: '20',
          fields: 'id,fname',
          search: 'fname:test',
          sort: 'fsize',
          reverse: true,
          table: true
        }),
        'files',
        undefined
      );
    });

    it('should handle csv output option', async () => {
      const mockListDo = jest.spyOn(filesListCmd, 'files_fetchList');
      mockListDo.mockResolvedValue({
        tableData: [
          { id: 1, fname: 'file1.txt', fsize: 100 }
        ],
        selectedFields: ['id', 'fname', 'fsize']
      });

      await program.parseAsync([
        'node',
        'chili',
        'files',
        'list',
        '--csv'
      ]);

      expect(mockListDo).toHaveBeenCalledWith(
        expect.objectContaining({
          csv: true
        }),
        'files',
        undefined
      );
    });

    it('should handle path argument with options', async () => {
      const mockListDo = jest.spyOn(filesListCmd, 'files_fetchList');
      mockListDo.mockResolvedValue({
        tableData: [],
        selectedFields: []
      });

      await program.parseAsync([
        'node',
        'chili',
        'files',
        'list',
        '/data/uploads',
        '--sort', 'creation_date',
        '--reverse'
      ]);

      expect(mockListDo).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: 'creation_date',
          reverse: true
        }),
        'files',
        '/data/uploads'
      );
    });

    it('should handle empty result set', async () => {
      const mockListDo = jest.spyOn(filesListCmd, 'files_fetchList');
      mockListDo.mockResolvedValue({
        tableData: [],
        selectedFields: []
      });

      await program.parseAsync([
        'node',
        'chili',
        'files',
        'list'
      ]);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('No files found')
      );
    });

    it('should handle null result', async () => {
      const mockListDo = jest.spyOn(filesListCmd, 'files_fetchList');
      mockListDo.mockResolvedValue(null);

      await program.parseAsync([
        'node',
        'chili',
        'files',
        'list'
      ]);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('No files resources found')
      );
    });
  });

  describe('fieldslist command', () => {
    it('should call fileFields_fetch', async () => {
      const mockFileFieldsFetch = jest.fn().mockResolvedValue([
        { fields: 'id' },
        { fields: 'fname' },
        { fields: 'fsize' }
      ]);

      jest.spyOn(require('../src/commands/files/fields'), 'fileFields_fetch')
        .mockImplementation(mockFileFieldsFetch);

      await program.parseAsync([
        'node',
        'chili',
        'files',
        'fieldslist'
      ]);

      expect(mockFileFieldsFetch).toHaveBeenCalledWith('files');
    });
  });
});

describe('file member commands', () => {
  let program: Command;
  let fileMemberHandler: FileMemberHandler;

  beforeEach(async () => {
    // Mock files_getSingle to return a mock ChRIS group object
    mockFilesGetSingle.mockResolvedValue({
      folder: '/test/path',
      asset: {
        resources_listAndFilterByOptions: jest.fn()
      }
    } as any);

    program = new Command();
    // Use factory method to create handler with a test path
    fileMemberHandler = await FileMemberHandler.handler_create('/test/path');
    fileMemberHandler.fileMemberCommand_setup(program);
    jest.clearAllMocks();
  });

  describe('create command', () => {
    it('should call files_create with content option', async () => {
      const mockCreateDo = jest.spyOn(fileCreateCmd, 'files_create');
      mockCreateDo.mockResolvedValue(true);

      await program.parseAsync([
        'node',
        'chili',
        'file',
        'create',
        'test.txt',
        '--content', 'Hello World'
      ]);

      expect(mockCreateDo).toHaveBeenCalledWith(
        'test.txt',
        expect.objectContaining({
          content: 'Hello World'
        })
      );
    });

    it('should call files_create with path and name options', async () => {
      const mockCreateDo = jest.spyOn(fileCreateCmd, 'files_create');
      mockCreateDo.mockResolvedValue(true);

      await program.parseAsync([
        'node',
        'chili',
        'file',
        'create',
        '--path', '/data',
        '--name', 'output.txt',
        '--content', 'Data'
      ]);

      expect(mockCreateDo).toHaveBeenCalledWith(
        undefined,
        expect.objectContaining({
          path: '/data',
          name: 'output.txt',
          content: 'Data'
        })
      );
    });
  });
});
