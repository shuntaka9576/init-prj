import * as path from 'path';

import * as fs from 'fs-extra';

const TEMPLATES_DIR = path.join(__dirname, 'init-templates');

export class InitTemplate {
  language: string;
  constructor(language: string) {
    this.language = language;
  }
}

async function listDirectory(dirPath: string): Promise<string[]> {
  return (await fs.readdir(dirPath)).filter(p => !p.startsWith('.')).sort();
}

const debug = async (): Promise<void> => {
  const paths = await listDirectory(TEMPLATES_DIR);
  console.log(paths);
};

debug();
