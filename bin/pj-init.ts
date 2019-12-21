import * as yargs from 'yargs';

import { data, debug, error, print, setVerbose, success } from '../lib/logging';
import { Configuration } from '../lib/settings';

async function parseCommandLineArguments(): Promise<any> {
  return yargs
    .env('pj-init')
    .usage('Usage:')
    .command('init [TEMPLATE]', 'Create a new template', yargs =>
      yargs.option('language', {
        type: 'string',
        alias: 'l',
      }),
    ).argv;
}

async function initCommandLine(): Promise<any> {
  const argv = await parseCommandLineArguments();
  debug(argv);

  const config = new Configuration(argv);
  debug(JSON.stringify(config));

  async function main(
    command: string,
    args: any,
  ): Promise<number | string | {} | void> {
    console.log(command, args);
    return 0;
  }
}

initCommandLine()
  .then(value => {
    if (value == null) {
      return;
    }
    if (typeof value === 'string') {
      data(value);
    } else if (typeof value === 'number') {
      process.exit(value);
    }
  })
  .catch(err => {
    error(err.message);
    debug(err.stack);
    process.exit(1);
  });
