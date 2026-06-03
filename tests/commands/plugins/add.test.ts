import { plugin_add, type PluginAddOutcome } from '../../../src/commands/plugins/add.js';
import * as salsa from '@fnndsc/salsa';
import * as cumin from '@fnndsc/cumin';
import * as docker from '../../../src/utils/docker.js';
import * as inputFormat from '../../../src/utils/input_format.js';

// Mock dependencies
jest.mock('@fnndsc/salsa');
// Manually mock cumin to ensure errorStack works
jest.mock('@fnndsc/cumin', () => ({
  computeResources_validate: jest.fn(),
  computeResourceNames_parse: jest.fn(),
  computeResources_getAll: jest.fn().mockResolvedValue({ ok: false }),
  errorStack: {
    allOfType_get: jest.fn().mockReturnValue([]),
    stack_push: jest.fn(),
  },
}));
jest.mock('../../../src/utils/docker.js');
jest.mock('../../../src/utils/input_format.js');
jest.mock('../../../src/utils/admin_prompt.js', () => ({
  adminCredentials_prompt: jest.fn().mockResolvedValue({ username: 'admin', password: 'pw' }),
}));

describe('plugin_add', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mocks
    (cumin.computeResources_validate as jest.Mock).mockResolvedValue({ ok: true });
    (cumin.computeResourceNames_parse as jest.Mock).mockReturnValue(['host']);
    (salsa.plugin_checkExists as jest.Mock).mockResolvedValue(null);
    (salsa.plugins_searchPeers as jest.Mock).mockResolvedValue(null);
    (inputFormat.input_detectFormat as jest.Mock).mockReturnValue({
      format: 'plugin_name',
      value: 'pl-test'
    });
    (docker.docker_checkAvailability as jest.Mock).mockResolvedValue(true);
    (docker.docker_pullImage as jest.Mock).mockResolvedValue(true);
    (docker.shellCommand_runWithDetails as jest.Mock).mockResolvedValue({
      success: true,
      stdout: JSON.stringify({ name: 'pl-test', dock_image: 'pl-test:latest' }),
      stderr: ''
    });
  });

  test('Phase 1: Exists in CUBE', async () => {
    (salsa.plugin_checkExists as jest.Mock).mockResolvedValue({ name: 'pl-test', id: 1 });

    const result: PluginAddOutcome = await plugin_add('pl-test', { compute: 'host' });

    expect(result).toBe('already_exists');
    expect(salsa.plugin_checkExists).toHaveBeenCalled();
  });

  test('Phase 2: Found in Peer Store', async () => {
    (salsa.plugins_searchPeers as jest.Mock).mockResolvedValue({
      plugin: { name: 'pl-test' },
      storeUrl: 'http://store/1',
      storeName: 'store'
    });
    (salsa.plugin_importFromStore as jest.Mock).mockResolvedValue({ success: true, plugin: { name: 'pl-test' } });

    const result: PluginAddOutcome = await plugin_add('pl-test', { compute: 'host' });

    expect(result).toBe('installed');
    expect(salsa.plugins_searchPeers).toHaveBeenCalled();
    expect(salsa.plugin_importFromStore).toHaveBeenCalled();
  });

  test('Phase 3: Docker Registration', async () => {
    (salsa.plugin_registerWithAdmin as jest.Mock).mockResolvedValue({ name: 'pl-test' });

    const result: PluginAddOutcome = await plugin_add('pl-test:latest', { compute: 'host' });

    expect(result).toBe('installed');
    expect(docker.docker_pullImage).toHaveBeenCalled();
    expect(salsa.plugin_registerWithAdmin).toHaveBeenCalled();
  });

  test('Compute validation failure', async () => {
    (cumin.computeResources_validate as jest.Mock).mockResolvedValue({ ok: false });

    const result: PluginAddOutcome = await plugin_add('pl-test', { compute: 'bad-resource' });

    expect(result).toBe('failed');
    expect(salsa.plugin_checkExists).not.toHaveBeenCalled();
  });

  test('Peer store import fails without auth', async () => {
    (salsa.plugins_searchPeers as jest.Mock).mockResolvedValue({
      plugin: { name: 'pl-test' },
      storeUrl: 'http://store/1',
      storeName: 'store'
    });
    (salsa.plugin_importFromStore as jest.Mock).mockResolvedValue({
      success: false,
      requiresAuth: false,
      errorMessage: 'import failed'
    });
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const result: PluginAddOutcome = await plugin_add('pl-test', { compute: 'host' });

    expect(result).toBe('failed');
    expect(salsa.plugin_importFromStore).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  test('Docker extraction aborts when docker is unavailable', async () => {
    (salsa.plugin_checkExists as jest.Mock).mockResolvedValue(null);
    (salsa.plugins_searchPeers as jest.Mock).mockResolvedValue(null);
    (docker.docker_checkAvailability as jest.Mock).mockResolvedValue(false);

    const result: PluginAddOutcome = await plugin_add('pl-test:latest', { compute: 'host' });

    expect(result).toBe('failed');
    expect(docker.docker_pullImage).not.toHaveBeenCalled();
  });
});
