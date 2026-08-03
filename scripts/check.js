import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import ejs from 'ejs';

const root = process.cwd();

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (['node_modules', '.git'].includes(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(fullPath));
    else files.push(fullPath);
  }
  return files;
}

function checkJavaScript(file) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--check', file], { stdio: 'inherit' });
    child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`Syntax check failed: ${file}`)));
  });
}

const files = await walk(root);
for (const file of files.filter((candidate) => candidate.endsWith('.js'))) {
  await checkJavaScript(file);
}

for (const file of files.filter((candidate) => candidate.endsWith('.ejs'))) {
  const source = await fs.readFile(file, 'utf8');
  ejs.compile(source, { filename: file });
}

console.log(`Checked ${files.filter((file) => /\.(js|ejs)$/.test(file)).length} JavaScript and EJS files.`);

