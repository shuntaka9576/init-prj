import * as path from 'path';
import * as childProcess from 'child_process';

import * as fs from 'fs-extra';
import * as camelCase from 'camelcase';

import decamelize = require('decamelize');
import { debug, print, warning } from './logging';

const INIT_TEMPLATES_DIR = path.join(__dirname, 'init-templates');
const INFO_DOT_JSON = 'info.json';

async function listDirectory(dirPath: string): Promise<string[]> {
  return (await fs.readdir(dirPath)).filter(p => !p.startsWith('.')).sort();
}

export class InitTemplate {
  public readonly description: string;
  public readonly aliases = new Set<string>();

  public static async initFromTemplateName(
    templateName: string,
  ): Promise<InitTemplate> {
    const basePath = path.join(INIT_TEMPLATES_DIR, templateName);
    const languages = (await listDirectory(basePath)).filter(
      f => f !== INFO_DOT_JSON,
    );
    const info = await fs.readJson(path.join(basePath, INFO_DOT_JSON));
    return new InitTemplate(basePath, templateName, languages, info);
  }

  constructor(
    private readonly basePath: string,
    public readonly templateName: string,
    public readonly languages: string[],
    info: any,
  ) {
    this.description = info.description;

    for (const alias of info.aliases || []) {
      this.aliases.add(alias);
    }
  }

  public hasName(aliasTemplateName: string): boolean {
    return (
      aliasTemplateName === this.templateName ||
      this.aliases.has(aliasTemplateName)
    );
  }

  public async install(
    language: string,
    targetDirectory: string,
  ): Promise<void> {
    if (this.languages.indexOf(language) === -1) {
      throw new Error(`Unsupported language: ${language}`);
    }
    const sourceDirectory = path.join(this.basePath, language);

    await this.installFiles(sourceDirectory, targetDirectory, {
      name: decamelize(path.basename(path.resolve(targetDirectory))),
    });
  }

  private async installFiles(
    sourceDirectory: string,
    targetDirectory: string,
    project: ProjectInfo,
  ): Promise<void> {
    for (const file of await fs.readdir(sourceDirectory)) {
      const fromFile = path.join(sourceDirectory, file);
      const toFile = path.join(targetDirectory, this.expand(file, project));

      if ((await fs.stat(fromFile)).isDirectory()) {
        await fs.mkdir(toFile);
        await this.installFiles(fromFile, toFile, project);
        continue;
      } else if (file.match(/^.*\.template\.[^.]+$/)) {
        await this.installProcessed(
          fromFile,
          toFile.replace(/\.template(\.[^.]+)$/, '$1'),
          project,
        );
        continue;
      } else {
        await fs.copy(fromFile, toFile);
      }
    }
  }

  private expand(template: string, project: ProjectInfo): string {
    return template
      .replace(/%name%/g, project.name)
      .replace(/%name\.camelCased%/g, camelCase(project.name))
      .replace(
        /%name\.PascalCased%/g,
        camelCase(project.name, { pascalCase: true }),
      )
      .replace(
        /%name\.StackName%/g,
        project.name.replace(/[^A-Za-z0-9-]/g, '-'),
      );
  }

  private async installProcessed(
    templatePath: string,
    toFile: string,
    project: ProjectInfo,
  ): Promise<void> {
    const template = await fs.readFile(templatePath, { encoding: 'utf-8' });
    await fs.writeFile(toFile, this.expand(template, project));
  }
}

async function availableInitTemplates(): Promise<InitTemplate[]> {
  const templateNames = await listDirectory(INIT_TEMPLATES_DIR);
  const templates = new Array<InitTemplate>();
  for (const templateName of templateNames) {
    templates.push(await InitTemplate.initFromTemplateName(templateName));
  }

  debug(`tempaltes: ${JSON.stringify(templates)}`);
  return templates;
}

function isRoot(dir: string): boolean {
  debug(`path.dirname: ${path.dirname(dir)}, dir: ${dir}`);
  return path.dirname(dir) === dir;
}

async function isInGitRepository(dir: string): Promise<boolean | undefined> {
  const flag = true;

  while (flag) {
    if (await fs.pathExists(path.join(dir, '.git'))) {
      return true;
    }
    if (isRoot(dir)) {
      return false;
    }
    dir = path.dirname(dir);
    return undefined;
  }
  return undefined;
}

async function execute(cmd: string, ...args: string[]): Promise<any> {
  const child = childProcess.spawn(cmd, args, {
    shell: true,
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  let stdout = '';
  child.stdout.on('data', chunk => (stdout += chunk.toString()));

  return new Promise<string>((ok, fail) => {
    child.once('error', err => fail(err));
    child.once('exit', status => {
      process.stdout.write(stdout);
      if (status === 0) {
        return ok(stdout);
      } else {
        process.stderr.write(stdout);
        return fail(new Error(`${cmd} exited with status ${status}`));
      }
    });
  });
}

async function initializeGitRepository(): Promise<void> {
  if (await isInGitRepository(process.cwd())) {
    return;
  }
  print('Initializing a new git repository...');
  try {
    await execute('git', 'init');
    await execute('git', 'add', '.');
    await execute(
      'git',
      'commit',
      '--message="Initial commit"',
      '--no-gpg-sign',
    );
  } catch (e) {
    warning('Unable to initialize git repository for your project.');
  }
}

async function postInstallTypescript(canUseNetwork: boolean): Promise<void> {
  const command = 'yarn';

  if (!canUseNetwork) {
    return;
  }

  try {
    await execute(command, 'install');
  } catch (e) {
    throw new Error();
  }
}

async function postInstall(
  language: string,
  canUseNetwork: boolean,
): Promise<void> {
  switch (language) {
    case 'typescript':
      return await postInstallTypescript(canUseNetwork);
  }
}

async function initializeProject(
  template: InitTemplate,
  language: string,
  canUseNetwork: boolean,
  generateOnly: boolean,
): Promise<void> {
  await template.install(language, process.cwd());

  if (!generateOnly) {
    await initializeGitRepository();
    await postInstall(language, canUseNetwork);
  }
}

export async function cliInit(
  templateType?: string,
  language?: string,
  canUseNetwork = true,
  generateOnly = false,
): Promise<void> {
  const template = (await availableInitTemplates()).find(t =>
    t.hasName(templateType!),
  );

  if (template && language) {
    await initializeProject(template, language, canUseNetwork, generateOnly);
  } else {
    throw new Error();
  }
}

interface ProjectInfo {
  readonly name: string;
}
