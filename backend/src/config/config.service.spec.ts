import * as fs from 'fs';
import { ConfigService } from './config.service';

jest.mock('fs');

describe('ConfigService', () => {
  const mockedFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    delete process.env.DEEPSEEK_API_KEY;
  });

  it('loads YAML config from file and overrides with env vars', () => {
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readFileSync.mockReturnValue('llm:\n  apiKey: yaml-key\n  baseUrl: http://example.com\n  model: test-model\n');

    process.env.DEEPSEEK_API_KEY = 'env-key';

    const cfg = new ConfigService();
    expect(cfg.llm.apiKey).toBe('env-key');
    expect(cfg.llm.baseUrl).toBe('http://example.com');
    expect(cfg.llm.model).toBe('test-model');
  });

  it('uses defaults when no config file is present', () => {
    mockedFs.existsSync.mockReturnValue(false);
    const cfg = new ConfigService();
    expect(cfg).toBeDefined();
    expect(typeof cfg.llm).toBe('object');
    expect(cfg.llm.provider).toBe('deepseek');
  });
});
