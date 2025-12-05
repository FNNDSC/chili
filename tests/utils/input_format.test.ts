import { input_detectFormat, PluginInputFormat, pluginName_extractFromImage } from '../../src/utils/input_format.js';

describe('Input Format Detection', () => {
  test('detects plugin name', () => {
    const result = input_detectFormat('pl-dircopy');
    expect(result).toEqual({
      format: PluginInputFormat.PLUGIN_NAME,
      value: 'pl-dircopy'
    });
  });

  test('detects docker image with tag', () => {
    const result = input_detectFormat('fnndsc/pl-dircopy:2.1.1');
    expect(result).toEqual({
      format: PluginInputFormat.DOCKER_IMAGE,
      value: 'fnndsc/pl-dircopy:2.1.1',
      pluginName: 'pl-dircopy',
      version: '2.1.1'
    });
  });

  test('detects docker image with slash but no tag', () => {
    const result = input_detectFormat('fnndsc/pl-dircopy');
    expect(result).toEqual({
      format: PluginInputFormat.DOCKER_IMAGE,
      value: 'fnndsc/pl-dircopy',
      pluginName: 'pl-dircopy'
    });
  });

  test('detects docker image with tag but no slash', () => {
    const result = input_detectFormat('pl-dircopy:latest');
    expect(result).toEqual({
      format: PluginInputFormat.DOCKER_IMAGE,
      value: 'pl-dircopy:latest',
      pluginName: 'pl-dircopy',
      version: 'latest'
    });
  });

  test('detects store URL (http)', () => {
    const url = 'http://cube.chrisproject.org/api/v1/plugins/96/';
    const result = input_detectFormat(url);
    expect(result).toEqual({
      format: PluginInputFormat.STORE_URL,
      value: url
    });
  });

  test('detects store URL (https)', () => {
    const url = 'https://cube.chrisproject.org/api/v1/plugins/96/';
    const result = input_detectFormat(url);
    expect(result).toEqual({
      format: PluginInputFormat.STORE_URL,
      value: url
    });
  });

  test('trims whitespace', () => {
    const result = input_detectFormat('  pl-dircopy  ');
    expect(result).toEqual({
      format: PluginInputFormat.PLUGIN_NAME,
      value: 'pl-dircopy'
    });
  });
});

describe('pluginName_extractFromImage', () => {
  test('extracts from full image with tag', () => {
    expect(pluginName_extractFromImage('fnndsc/pl-dircopy:2.1.1')).toBe('pl-dircopy');
  });

  test('extracts from image without tag', () => {
    expect(pluginName_extractFromImage('fnndsc/pl-dircopy')).toBe('pl-dircopy');
  });

  test('extracts from image with only tag', () => {
    expect(pluginName_extractFromImage('pl-dircopy:latest')).toBe('pl-dircopy');
  });

  test('extracts from simple name (fallback)', () => {
    expect(pluginName_extractFromImage('pl-dircopy')).toBe('pl-dircopy');
  });

  test('extracts from localhost registry', () => {
    expect(pluginName_extractFromImage('localhost:5000/pl-dircopy:latest')).toBe('pl-dircopy');
  });
});
