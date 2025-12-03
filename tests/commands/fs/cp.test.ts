import { files_cp } from '../../../src/commands/fs/cp';
import * as salsa from '@fnndsc/salsa';
import * as cumin from '@fnndsc/cumin';
import * as cliUtils from '../../../src/utils/cli';

jest.mock('@fnndsc/salsa');
jest.mock('@fnndsc/cumin', () => {
  const actual = jest.requireActual('@fnndsc/cumin');
  return {
    ...actual,
    errorStack: {
      stack_push: jest.fn(),
    },
  };
});

describe('files_cp', () => {
  const files_copy = salsa.files_copy as jest.Mock;
  const files_copyRecursively = salsa.files_copyRecursively as jest.Mock;
  const files_listAll = salsa.files_listAll as jest.Mock;
  const path_resolveChrisFs = jest.spyOn(cliUtils, 'path_resolveChrisFs');

  beforeEach(() => {
    jest.clearAllMocks();
    path_resolveChrisFs.mockImplementation(async (p: string | undefined) => p ?? '/');
  });

  it('appends basename when destination is an existing directory', async () => {
    files_listAll.mockImplementation(async (_opts: any, asset: string, dir: string) => {
      if (asset === 'dirs' && dir === '/home/rudolphpienaar') {
        return { tableData: [{ path: '/home/rudolphpienaar/up2' }] };
      }
      return { tableData: [] };
    });
    files_copy.mockResolvedValue(true);

    const success = await files_cp('/home/rudolphpienaar/uploads/file.txt', '/home/rudolphpienaar/up2', {});

    expect(success).toBe(true);
    expect(files_copy).toHaveBeenCalledWith(
      '/home/rudolphpienaar/uploads/file.txt',
      '/home/rudolphpienaar/up2/file.txt'
    );
  });

  it('refuses to copy a directory without --recursive', async () => {
    files_listAll.mockImplementation(async (_opts: any, asset: string, dir: string) => {
      if (asset === 'dirs' && dir === '/home') {
        return { tableData: [{ path: '/home/uploads' }] };
      }
      return { tableData: [] };
    });

    const success = await files_cp('/home/uploads', '/home/target', {});

    expect(success).toBe(false);
    expect(files_copyRecursively).not.toHaveBeenCalled();
    expect((cumin as any).errorStack.stack_push).toHaveBeenCalled();
  });

  it('copies a directory recursively to a directory destination', async () => {
    files_listAll.mockImplementation(async (_opts: any, asset: string, dir: string) => {
      if (asset === 'dirs' && dir === '/home') {
        return { tableData: [{ path: '/home/uploads' }] };
      }
      if (asset === 'dirs' && dir === '/home/rudolphpienaar') {
        return { tableData: [{ path: '/home/rudolphpienaar/up2' }] };
      }
      return { tableData: [] };
    });
    files_copyRecursively.mockResolvedValue(true);

    const success = await files_cp('/home/uploads', '/home/rudolphpienaar/up2', { recursive: true });

    expect(success).toBe(true);
    expect(files_copyRecursively).toHaveBeenCalledWith(
      '/home/uploads',
      '/home/rudolphpienaar/up2/uploads'
    );
  });
});
