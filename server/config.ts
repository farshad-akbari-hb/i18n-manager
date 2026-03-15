/**
 * Centralized configuration for i18n-manager
 *
 * Resolution order: env vars > .i18n-managerrc.json > defaults
 */

import { readFileSync } from 'fs';
import path from 'path';

export interface ManagerConfig {
  baselinePath: string;
  historyDir: string;
  translatorCliPath: string;
  translatorCwd: string;
  projectRoot: string;
  translationPaths: string[];
  supportedLanguages: string[];
}

export interface RcFile {
  baselinePath?: string;
  historyDir?: string;
  translatorCliPath?: string;
  translatorCwd?: string;
  projectRoot?: string;
  translationPaths?: string[];
  supportedLanguages?: string[];
}

let _config: ManagerConfig | null = null;

function resolveTranslatorCliPath(): string {
  // Try require.resolve first
  try {
    return require.resolve('@farshad-ak/i18n-translator/dist/index.js');
  } catch {
    // Fallback: look in node_modules relative to cwd
    return path.join(process.cwd(), 'node_modules', '@farshad', 'i18n-translator', 'dist', 'index.js');
  }
}

export function loadRcFile(cwd: string = process.cwd()): RcFile | null {
  const rcPath = path.join(cwd, '.i18n-managerrc.json');
  try {
    const content = readFileSync(rcPath, 'utf-8');
    return JSON.parse(content) as RcFile;
  } catch {
    return null;
  }
}

export function resolveField(
  fieldName: string,
  envVar: string | undefined,
  rcValue: unknown,
  defaultValue: string | undefined
): { value: string | undefined; source: string } {
  if (envVar !== undefined && envVar !== '') {
    return { value: envVar, source: 'env' };
  }
  if (rcValue !== undefined && rcValue !== null) {
    return { value: String(rcValue), source: 'rc file' };
  }
  if (defaultValue !== undefined) {
    return { value: defaultValue, source: 'default' };
  }
  return { value: undefined, source: 'missing' };
}

/**
 * Build config from rc file data and env vars.
 * Pure function (no I/O) for testability.
 */
export function buildConfig(
  rc: RcFile | null,
  env: Record<string, string | undefined>,
  cwd: string
): ManagerConfig {
  const sources: Record<string, string> = {};

  // projectRoot
  const projectRootResult = resolveField(
    'projectRoot',
    env.I18N_MANAGER_PROJECT_ROOT,
    rc?.projectRoot,
    cwd
  );
  const projectRoot = path.resolve(projectRootResult.value!);
  sources['projectRoot'] = projectRootResult.source;

  // baselinePath (required)
  const baselineResult = resolveField(
    'baselinePath',
    env.I18N_MANAGER_BASELINE_PATH,
    rc?.baselinePath,
    undefined
  );
  if (!baselineResult.value) {
    throw new Error(
      'i18n-manager: baselinePath is required. Set it in .i18n-managerrc.json or I18N_MANAGER_BASELINE_PATH env var.'
    );
  }
  const baselinePath = path.resolve(projectRoot, baselineResult.value);
  sources['baselinePath'] = baselineResult.source;

  // supportedLanguages (required)
  let supportedLanguages: string[];
  if (env.I18N_MANAGER_SUPPORTED_LANGUAGES) {
    supportedLanguages = env.I18N_MANAGER_SUPPORTED_LANGUAGES.split(',').map(s => s.trim());
    sources['supportedLanguages'] = 'env';
  } else if (rc?.supportedLanguages && Array.isArray(rc.supportedLanguages)) {
    supportedLanguages = rc.supportedLanguages;
    sources['supportedLanguages'] = 'rc file';
  } else {
    throw new Error(
      'i18n-manager: supportedLanguages is required. Set it in .i18n-managerrc.json or I18N_MANAGER_SUPPORTED_LANGUAGES env var.'
    );
  }

  // historyDir
  const historyResult = resolveField(
    'historyDir',
    env.I18N_MANAGER_HISTORY_DIR,
    rc?.historyDir,
    path.join(projectRoot, '.translation-history')
  );
  const historyDir = path.resolve(projectRoot, historyResult.value!);
  sources['historyDir'] = historyResult.source;

  // translatorCliPath
  const cliResult = resolveField(
    'translatorCliPath',
    env.I18N_MANAGER_TRANSLATOR_CLI_PATH,
    rc?.translatorCliPath,
    undefined
  );
  const translatorCliPath = cliResult.value
    ? path.resolve(projectRoot, cliResult.value)
    : resolveTranslatorCliPath();
  sources['translatorCliPath'] = cliResult.value ? cliResult.source : 'default (resolved)';

  // translatorCwd
  const cwdResult = resolveField(
    'translatorCwd',
    env.I18N_MANAGER_TRANSLATOR_CWD,
    rc?.translatorCwd,
    path.dirname(translatorCliPath)
  );
  const translatorCwd = path.resolve(projectRoot, cwdResult.value!);
  sources['translatorCwd'] = cwdResult.source;

  // translationPaths
  let translationPaths: string[];
  if (env.I18N_MANAGER_TRANSLATION_PATHS) {
    translationPaths = env.I18N_MANAGER_TRANSLATION_PATHS.split(',').map(s => s.trim());
    sources['translationPaths'] = 'env';
  } else if (rc?.translationPaths && Array.isArray(rc.translationPaths)) {
    translationPaths = rc.translationPaths;
    sources['translationPaths'] = 'rc file';
  } else {
    // Default to dirname of baselinePath relative to projectRoot
    const relBaseline = path.relative(projectRoot, path.dirname(baselinePath));
    translationPaths = [relBaseline.endsWith('/') ? relBaseline : relBaseline + '/'];
    sources['translationPaths'] = 'default';
  }

  // Log config source
  console.log('[i18n-manager] Config loaded:');
  for (const [field, source] of Object.entries(sources)) {
    console.log(`  ${field}: ${source}`);
  }

  return {
    baselinePath,
    historyDir,
    translatorCliPath,
    translatorCwd,
    projectRoot,
    translationPaths,
    supportedLanguages,
  };
}

export function loadConfig(): ManagerConfig {
  const rc = loadRcFile();
  _config = buildConfig(rc, process.env, process.cwd());
  return _config;
}

export const config: ManagerConfig = new Proxy({} as ManagerConfig, {
  get(_target, prop: string) {
    if (!_config) {
      throw new Error('i18n-manager: config not loaded. Call loadConfig() first.');
    }
    return (_config as Record<string, unknown>)[prop];
  },
});
