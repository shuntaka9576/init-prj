import * as util from './util';
import { debug } from './logging';

export type Arguments = { readonly [name: string]: unknown };
export type SettingsMap = { [key: string]: any };

export class Settings {
  constructor(
    private settings: SettingsMap = {},
    public readonly readOnly = false,
  ) {}

  public get(path: string[]): any {
    debug(JSON.stringify(this.settings));
    return util.deepClone(util.deepGet(this.settings, path));
  }

  public merge(other: Settings): Settings {
    return new Settings(util.deepMerge(this.settings, other.settings));
  }

  public static fromCommandLineArguments(argv: Arguments): Settings {
    return new Settings({
      app: argv.app,
      browser: argv.browser,
      language: argv.language,
      pathMetadata: argv.pathMetadata,
      assetMetadata: argv.assetMetadata,
      plugin: argv.plugin,
      requireApproval: argv.requireApproval,
      toolkitStackName: argv.toolkitStackName,
      versionReporting: argv.versionReporting,
      staging: argv.staging,
      output: argv.output,
    });
  }
}

export class Configuration {
  public settings = new Settings();
  private readonly commandLineArguments: Settings;
  private loaded = false;

  constructor(commandLineArguments?: Arguments) {
    this.commandLineArguments = commandLineArguments
      ? Settings.fromCommandLineArguments(commandLineArguments)
      : new Settings();
  }

  public readonly defaultConfig = new Settings({
    versionReporting: true,
    pathMetadata: true,
    output: 'cdk.out',
  });

  public async load(): Promise<this> {
    this.settings = this.defaultConfig.merge(this.commandLineArguments);
    this.loaded = true;

    return this;
  }
}
