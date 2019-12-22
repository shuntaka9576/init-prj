import * as path from 'path';

import * as fs from 'fs-extra';
import * as camelCase from 'camelcase';

import decamelize = require('decamelize');
import { debug } from './logging';

const TEMPLATES_DIR = path.join(__dirname, 'init-templates');
const INFO_DOT_JSON = 'info.json';

async function listDirectory(dirPath: string): Promise<string[]> {
  return (await fs.readdir(dirPath)).filter(p => !p.startsWith('.')).sort();
}

export class InitTemplate {
  public readonly description: string;
  public readonly aliases = new Set<string>();

  public static async fromName(name: string): Promise<InitTemplate> {
    const basePath = path.join(TEMPLATES_DIR, name);
    const languages = (await listDirectory(basePath)).filter(
      f => f !== INFO_DOT_JSON,
    );
    const info = await fs.readJson(path.join(basePath, INFO_DOT_JSON));
    return new InitTemplate(basePath, name, languages, info);
  }

  constructor(
    private readonly basePath: string,
    public readonly name: string,
    public readonly languages: string[],
    info: any,
  ) {
    this.description = info.description;
    for (const alias of info.aliases || []) {
      debug(`alias: ${alias}`);
      this.aliases.add(alias); // TODO ailias入ってない問題
    }
  }

  public hasName(name: string): boolean {
    return name === this.name || this.aliases.has(name);
  }

  public async install(
    language: string,
    targetDirectory: string,
  ): Promise<void> {
    if (this.languages.indexOf(language) === -1) {
      throw new Error(`Unsupported language: ${language}`);
    }
    const sourceDirectory = path.join(this.basePath, language);
    const hookTempDirectory = path.join(targetDirectory, 'tmp');
    await fs.mkdir(hookTempDirectory);

    debug(`sourceDirectory: ${sourceDirectory}`);
    debug(`hookTempDirectory: ${hookTempDirectory}`);
    debug(`targetDirectory: ${targetDirectory}`);
    debug(
      `decamelize: ${decamelize(path.basename(path.resolve(targetDirectory)))}`,
    );

    await this.installFiles(sourceDirectory, targetDirectory, {
      name: decamelize(path.basename(path.resolve(targetDirectory))),
    });
    // await this.applyFutureFlags(targetDirectory);
    // await this.invokeHooks(hookTempDirectory, targetDirectory);
    // await fs.remove(hookTempDirectory);
  }

  private async installFiles(
    sourceDirectory: string,
    targetDirectory: string,
    project: ProjectInfo,
  ): Promise<void> {
    for (const file of await fs.readdir(sourceDirectory)) {
      debug(`file: ${file}`);

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
      } else if (file.match(/^.*\.hook\.(d.)?[^.]+$/)) {
        await this.installProcessed(
          fromFile,
          path.join(targetDirectory, 'tmp', file),
          project,
        );
        continue;
      } else {
        await fs.copy(fromFile, toFile);
      }
    }
  }

  private async installProcessed(
    templatePath: string,
    toFile: string,
    project: ProjectInfo,
  ): Promise<void> {
    const template = await fs.readFile(templatePath, { encoding: 'utf-8' });
    await fs.writeFile(toFile, this.expand(template, project));
  }

  private expand(template: string, project: ProjectInfo): string {
    const MATCH_VER_BUILD = /\+[a-f0-9]+$/; // Matches "+BUILD" in "x.y.z-beta+BUILD"
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const cdkVersion = require('../package.json').version.replace(
      MATCH_VER_BUILD,
      '',
    );
    return template
      .replace(/%name%/g, project.name)
      .replace(/%name\.camelCased%/g, camelCase(project.name))
      .replace(
        /%name\.PascalCased%/g,
        camelCase(project.name, { pascalCase: true }),
      )
      .replace(/%cdk-version%/g, cdkVersion)
      .replace(/%name\.PythonModule%/g, project.name.replace(/-/g, '_'))
      .replace(
        /%name\.StackName%/g,
        project.name.replace(/[^A-Za-z0-9-]/g, '-'),
      );
  }
}

export const availableInitTemplates = async (): Promise<InitTemplate[]> => {
  const templateNames = await listDirectory(TEMPLATES_DIR);
  const templates = new Array<InitTemplate>();
  for (const templateName of templateNames) {
    templates.push(await InitTemplate.fromName(templateName));
  }
  return templates;
};

async function initializeProject(
  template: InitTemplate,
  language: string,
  canUseNetwork: boolean,
  generateOnly: boolean,
): Promise<void> {
  await template.install(language, process.cwd());
  // if (!generateOnly) {
  //   await initializeGitRepository();
  //   await postInstall(language, canUseNetwork);
  // }
}

export async function cliInit(
  type?: string,
  language?: string,
  canUseNetwork = true,
  generateOnly = false,
) {
  debug(`type: ${type}`);
  debug(`language: ${language}`);

  type = type || 'default';

  const template = (await availableInitTemplates()).find(t => t.hasName(type!));
  debug(`template: ${JSON.stringify(template)}`);

  if (template && language) {
    await initializeProject(template, language, canUseNetwork, generateOnly);
  } else {
    throw new Error();
  }
}

interface ProjectInfo {
  /** The value used for %name% */
  readonly name: string;
}
