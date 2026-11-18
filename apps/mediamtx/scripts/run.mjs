#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const binaryPath = join(root, 'bin', 'mediamtx');
const configPath = join(root, 'mediamtx.yml');

async function ensureBinary() {
  if (existsSync(binaryPath)) return;
  const require = createRequire(import.meta.url);
  // Run download script in-process via spawn for clarity
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(__dirname, 'download.mjs')], {
      cwd: root,
      stdio: 'inherit',
    });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`download.mjs exited with ${code}`));
    });
  });
  void require;
}

async function main() {
  await ensureBinary();

  if (!existsSync(configPath)) {
    throw new Error(`Missing config: ${configPath}`);
  }

  const child = spawn(binaryPath, [configPath], {
    cwd: root,
    stdio: 'inherit',
  });

  const stop = () => {
    child.kill('SIGTERM');
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  child.on('exit', (code, signal) => {
    if (signal) process.exit(1);
    process.exit(code ?? 0);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
