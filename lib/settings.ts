import { debug, warning } from './logging';

export type Arguments = { readonly [name: string]: unknown };
export type SettingsMap = { [key: string]: any };

export class Settings {
  constructor(
    private settings: SettingsMap = {},
    public readonly readOnly = false,
  ) {}

  /**
   * Parse Settings out of CLI arguments.
   * @param argv the received CLI arguments.
   * @returns a new Settings object.
   */
  public static fromCommandLineArguments(argv: Arguments): Settings {
    const context = this.parseStringContextListToObject(argv);
    debug(context);
    // const tags = this.parseStringTagsListToObject(argv);
    debug(`fromCommandLineArguments${JSON.stringify(argv)}`);
    debug(`argv.language: ${argv.language}`);

    return new Settings({
      app: argv.app,
      browser: argv.browser,
      context,
      // tags,
      language: argv.language,
      pathMetadata: argv.pathMetadata,
      assetMetadata: argv.assetMetadata,
      plugin: argv.plugin,
      requireApproval: argv.requireApproval,
      toolkitStackName: argv.toolkitStackName,
      toolkitBucket: {
        bucketName: argv.bootstrapBucketName,
        kmsKeyId: argv.bootstrapKmsKeyId,
      },
      versionReporting: argv.versionReporting,
      staging: argv.staging,
      output: argv.output,
    });
  }

  private static parseStringContextListToObject(argv: Arguments): any {
    const context: any = {};

    for (const assignment of (argv as any).context || []) {
      const parts = assignment.split('=', 2);
      if (parts.length === 2) {
        debug('CLI argument context: %s=%s', parts[0], parts[1]);
        if (parts[0].match(/^aws:.+/)) {
          throw new Error(
            `User-provided context cannot use keys prefixed with 'aws:', but ${parts[0]} was provided.`,
          );
        }
        context[parts[0]] = parts[1];
      } else {
        warning(
          'Context argument is not an assignment (key=value): %s',
          assignment,
        );
      }
    }
    return context;
  }
}

export class Configuration {
  public settings = new Settings();
  private readonly commandLineArguments: Settings;
  // public context = new Context();
  //
  //
  public readonly defaultConfig = new Settings({
    versionReporting: true,
    pathMetadata: true,
    output: 'cdk.out',
  });

  constructor(commandLineArguments?: Arguments) {
    this.commandLineArguments = commandLineArguments
      ? Settings.fromCommandLineArguments(commandLineArguments)
      : new Settings();
  }
}
