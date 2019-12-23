import * as yargs from 'yargs';

import { data, debug, error, print, setVerbose, success } from '../lib/logging';
import { Configuration, Settings } from '../lib/settings';
import { cliInit } from '../lib/init';

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
  const configuration: Configuration = new Configuration(argv);
  await configuration.load();

  const cmd = argv._[0];

  switch (cmd) {
    case 'init': {
      const language = configuration.settings.get(['language']);
      debug(`language: ${language}`);
      await cliInit(argv.TEMPLATE, language, undefined, false);
    }
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
