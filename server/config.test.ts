import { describe, it, expect } from 'vitest';
import path from 'path';
import { buildConfig, resolveField, type RcFile } from './config.js';

const TEST_CWD = '/fake/project';

function minimalRc(overrides: Partial<RcFile> = {}): RcFile {
  return {
    baselinePath: 'src/i18n/en.json',
    supportedLanguages: ['de', 'fr'],
    ...overrides,
  };
}

function noEnv(): Record<string, string | undefined> {
  return {};
}

// ---------------------------------------------------------------------------
// resolveField
// ---------------------------------------------------------------------------
describe('resolveField', () => {
  it('prefers env var over rc file and default', () => {
    const result = resolveField('test', 'from-env', 'from-rc', 'from-default');
    expect(result).toEqual({ value: 'from-env', source: 'env' });
  });

  it('falls back to rc file when env is undefined', () => {
    const result = resolveField('test', undefined, 'from-rc', 'from-default');
    expect(result).toEqual({ value: 'from-rc', source: 'rc file' });
  });

  it('falls back to default when env and rc are undefined', () => {
    const result = resolveField('test', undefined, undefined, 'from-default');
    expect(result).toEqual({ value: 'from-default', source: 'default' });
  });

  it('returns missing when all sources are undefined', () => {
    const result = resolveField('test', undefined, undefined, undefined);
    expect(result).toEqual({ value: undefined, source: 'missing' });
  });

  it('treats empty string env var as missing', () => {
    const result = resolveField('test', '', 'from-rc', 'from-default');
    expect(result).toEqual({ value: 'from-rc', source: 'rc file' });
  });

  it('treats null rc value as missing', () => {
    const result = resolveField('test', undefined, null, 'from-default');
    expect(result).toEqual({ value: 'from-default', source: 'default' });
  });
});

// ---------------------------------------------------------------------------
// buildConfig — required fields validation
// ---------------------------------------------------------------------------
describe('buildConfig — required fields', () => {
  it('throws when baselinePath is missing', () => {
    const rc: RcFile = { supportedLanguages: ['de'] };
    expect(() => buildConfig(rc, noEnv(), TEST_CWD)).toThrow(
      'baselinePath is required'
    );
  });

  it('throws when supportedLanguages is missing', () => {
    const rc: RcFile = { baselinePath: 'src/i18n/en.json' };
    expect(() => buildConfig(rc, noEnv(), TEST_CWD)).toThrow(
      'supportedLanguages is required'
    );
  });

  it('throws when both rc and env are null', () => {
    expect(() => buildConfig(null, noEnv(), TEST_CWD)).toThrow(
      'baselinePath is required'
    );
  });
});

// ---------------------------------------------------------------------------
// buildConfig — rc file values
// ---------------------------------------------------------------------------
describe('buildConfig — rc file', () => {
  it('loads all fields from rc file', () => {
    const rc: RcFile = {
      baselinePath: 'src/i18n/en.json',
      historyDir: '.my-history',
      projectRoot: '/custom/root',
      translationPaths: ['src/i18n/', 'lib/translations/'],
      supportedLanguages: ['de', 'fa', 'ar'],
      translatorCliPath: 'tools/translator/dist/index.js',
      translatorCwd: 'tools/translator',
    };

    const config = buildConfig(rc, noEnv(), TEST_CWD);

    expect(config.baselinePath).toBe(path.resolve('/custom/root', 'src/i18n/en.json'));
    expect(config.historyDir).toBe(path.resolve('/custom/root', '.my-history'));
    expect(config.projectRoot).toBe(path.resolve('/custom/root'));
    expect(config.translationPaths).toEqual(['src/i18n/', 'lib/translations/']);
    expect(config.supportedLanguages).toEqual(['de', 'fa', 'ar']);
    expect(config.translatorCliPath).toBe(path.resolve('/custom/root', 'tools/translator/dist/index.js'));
    expect(config.translatorCwd).toBe(path.resolve('/custom/root', 'tools/translator'));
  });

  it('defaults projectRoot to cwd', () => {
    const config = buildConfig(minimalRc(), noEnv(), TEST_CWD);
    expect(config.projectRoot).toBe(path.resolve(TEST_CWD));
  });

  it('defaults historyDir to projectRoot/.translation-history', () => {
    const config = buildConfig(minimalRc(), noEnv(), TEST_CWD);
    expect(config.historyDir).toBe(path.resolve(TEST_CWD, '.translation-history'));
  });

  it('defaults translationPaths to dirname of baselinePath', () => {
    const config = buildConfig(minimalRc({ baselinePath: 'src/i18n/en.json' }), noEnv(), TEST_CWD);
    expect(config.translationPaths).toEqual(['src/i18n/']);
  });
});

// ---------------------------------------------------------------------------
// buildConfig — env var overrides
// ---------------------------------------------------------------------------
describe('buildConfig — env overrides', () => {
  it('env baselinePath overrides rc file', () => {
    const env = {
      I18N_MANAGER_BASELINE_PATH: 'override/path/en.json',
      I18N_MANAGER_SUPPORTED_LANGUAGES: 'de',
    };
    const config = buildConfig(minimalRc(), env, TEST_CWD);
    expect(config.baselinePath).toBe(path.resolve(TEST_CWD, 'override/path/en.json'));
  });

  it('env supportedLanguages overrides rc file', () => {
    const env = {
      I18N_MANAGER_SUPPORTED_LANGUAGES: 'es, it, pt',
    };
    const config = buildConfig(minimalRc(), env, TEST_CWD);
    expect(config.supportedLanguages).toEqual(['es', 'it', 'pt']);
  });

  it('env projectRoot overrides rc and default', () => {
    const env = {
      I18N_MANAGER_PROJECT_ROOT: '/env/root',
    };
    const config = buildConfig(minimalRc(), env, TEST_CWD);
    expect(config.projectRoot).toBe(path.resolve('/env/root'));
  });

  it('env historyDir overrides default', () => {
    const env = {
      I18N_MANAGER_HISTORY_DIR: '/custom/history',
    };
    const config = buildConfig(minimalRc(), env, TEST_CWD);
    expect(config.historyDir).toBe(path.resolve(TEST_CWD, '/custom/history'));
  });

  it('env translationPaths overrides rc file', () => {
    const env = {
      I18N_MANAGER_TRANSLATION_PATHS: 'path/a/, path/b/',
    };
    const config = buildConfig(minimalRc(), env, TEST_CWD);
    expect(config.translationPaths).toEqual(['path/a/', 'path/b/']);
  });

  it('env translatorCliPath overrides default resolution', () => {
    const env = {
      I18N_MANAGER_TRANSLATOR_CLI_PATH: '/explicit/cli.js',
    };
    const config = buildConfig(minimalRc(), env, TEST_CWD);
    expect(config.translatorCliPath).toBe(path.resolve(TEST_CWD, '/explicit/cli.js'));
  });

  it('env translatorCwd overrides default', () => {
    const env = {
      I18N_MANAGER_TRANSLATOR_CWD: '/explicit/cwd',
    };
    const config = buildConfig(minimalRc(), env, TEST_CWD);
    expect(config.translatorCwd).toBe(path.resolve(TEST_CWD, '/explicit/cwd'));
  });

  it('env can provide required fields without rc file', () => {
    const env = {
      I18N_MANAGER_BASELINE_PATH: 'loc/en.json',
      I18N_MANAGER_SUPPORTED_LANGUAGES: 'de,fr',
    };
    const config = buildConfig(null, env, TEST_CWD);
    expect(config.baselinePath).toBe(path.resolve(TEST_CWD, 'loc/en.json'));
    expect(config.supportedLanguages).toEqual(['de', 'fr']);
  });
});

// ---------------------------------------------------------------------------
// buildConfig — ManagerConfig shape
// ---------------------------------------------------------------------------
describe('buildConfig — output shape', () => {
  it('returns all required ManagerConfig fields', () => {
    const config = buildConfig(minimalRc(), noEnv(), TEST_CWD);
    expect(config).toHaveProperty('baselinePath');
    expect(config).toHaveProperty('historyDir');
    expect(config).toHaveProperty('translatorCliPath');
    expect(config).toHaveProperty('translatorCwd');
    expect(config).toHaveProperty('projectRoot');
    expect(config).toHaveProperty('translationPaths');
    expect(config).toHaveProperty('supportedLanguages');
  });

  it('all paths are absolute', () => {
    const config = buildConfig(minimalRc(), noEnv(), TEST_CWD);
    expect(path.isAbsolute(config.baselinePath)).toBe(true);
    expect(path.isAbsolute(config.historyDir)).toBe(true);
    expect(path.isAbsolute(config.translatorCliPath)).toBe(true);
    expect(path.isAbsolute(config.translatorCwd)).toBe(true);
    expect(path.isAbsolute(config.projectRoot)).toBe(true);
  });

  it('translatorCwd defaults to projectRoot', () => {
    const config = buildConfig(minimalRc(), noEnv(), TEST_CWD);
    expect(config.translatorCwd).toBe(config.projectRoot);
  });
});
