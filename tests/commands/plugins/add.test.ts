import { plugin_add } from '../../../src/commands/plugins/add';
import * as salsa from '@fnndsc/salsa';
import * as dockerUtils from '../../../src/utils/docker';

jest.mock('@fnndsc/salsa');
jest.mock('../../../src/utils/docker');

describe('plugin_add', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (dockerUtils.docker_checkAvailability as jest.Mock).mockResolvedValue(true);
  });

  it('should fail if docker is not available', async () => {
    (dockerUtils.docker_checkAvailability as jest.Mock).mockResolvedValue(false);
    const result = await plugin_add('image', {});
    expect(result).toBe(false);
  });

  it('should orchestrate docker pull, info extraction and registration', async () => {
    (dockerUtils.shellCommand_run as jest.Mock).mockImplementation(async (cmd: string) => {
      if (cmd.includes('pull')) return 'Status: Downloaded';
      if (cmd.includes('chris_plugin_info')) return JSON.stringify({ name: 'pl-test', dock_image: 'test/image' });
      return null;
    });

    (salsa.plugin_register as jest.Mock).mockResolvedValue({ id: 1, name: 'pl-test' });

    const result = await plugin_add('test/image', { compute: 'local' });

    expect(dockerUtils.shellCommand_run).toHaveBeenCalledWith(expect.stringContaining('docker pull'));
    expect(dockerUtils.shellCommand_run).toHaveBeenCalledWith(expect.stringContaining('chris_plugin_info'));
    expect(salsa.plugin_register).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'pl-test', dock_image: 'test/image' }),
      ['local']
    );
    expect(result).toBe(true);
  });

  it('should fallback to --json if chris_plugin_info fails', async () => {
    (dockerUtils.shellCommand_run as jest.Mock).mockImplementation(async (cmd: string) => {
      if (cmd.includes('pull')) return 'Status: Downloaded';
      if (cmd.includes('chris_plugin_info')) return null; // Simulate failure
      if (cmd.includes('--json')) return JSON.stringify({ name: 'pl-legacy' });
      return null;
    });

    (salsa.plugin_register as jest.Mock).mockResolvedValue({ id: 2, name: 'pl-legacy' });

    const result = await plugin_add('legacy/image', {});

    expect(dockerUtils.shellCommand_run).toHaveBeenCalledWith(expect.stringContaining('--json'));
    expect(salsa.plugin_register).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('should fail if json extraction fails', async () => {
    (dockerUtils.shellCommand_run as jest.Mock).mockResolvedValue(null); // All commands fail or return empty

    const result = await plugin_add('broken/image', {});

    expect(result).toBe(false);
    expect(salsa.plugin_register).not.toHaveBeenCalled();
  });
});
