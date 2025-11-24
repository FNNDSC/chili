import { manpage_handle, ManPageOptions } from '../../../src/commands/man/doc';
import * as renderer from '../../../src/man/renderer';
import fs from 'fs';

jest.mock('fs');
jest.mock('../../../src/man/renderer');

describe('commands/man/doc', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (renderer.projectDir_get as jest.Mock).mockReturnValue('/test/project');
  });

  it('should display manpage in console', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue('content');
    (renderer.asciidoc_render as jest.Mock).mockResolvedValue('rendered content');

    const options: ManPageOptions = { topic: 'test', style: 'ascii' };
    await manpage_handle(options);

    expect(fs.readFileSync).toHaveBeenCalledWith(expect.stringContaining('test.adoc'), 'utf-8');
    expect(renderer.asciidoc_render).toHaveBeenCalledWith('content', 'ascii', undefined);
    expect(consoleSpy).toHaveBeenCalledWith('rendered content');
    consoleSpy.mockRestore();
  });

  it('should open browser if browser option is true', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    const options: ManPageOptions = { topic: 'test', style: 'ascii', browser: true };
    await manpage_handle(options);

    expect(renderer.browser_open).toHaveBeenCalledWith(expect.stringContaining('test.adoc'));
  });

  it('should log error if doc not found', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    const options: ManPageOptions = { topic: 'missing', style: 'ascii' };
    await manpage_handle(options);

    expect(consoleSpy).toHaveBeenCalledWith("Documentation for 'missing' not found.");
    consoleSpy.mockRestore();
  });
});
