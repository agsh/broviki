#!/usr/bin/env node
import { chmodSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const VERSION = process.env.MEDIAMTX_VERSION ?? 'v1.21.4';
const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const binDir = join(root, 'bin');
const binaryPath = join(binDir, 'mediamtx');

const archMap = {
  x64: 'amd64',
  arm64: 'arm64',
  arm: 'armv7',
};

function detectAsset() {
  const platform = process.platform;
  const arch = archMap[process.arch];
  if (!arch) {
    throw new Error(`Unsupported arch: ${process.arch}`);
  }

  const os =
    platform === 'linux'
      ? 'linux'
      : platform === 'darwin'
        ? 'darwin'
        : platform === 'win32'
          ? 'windows'
          : null;

  if (!os) {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  const ext = platform === 'win32' ? 'zip' : 'tar.gz';
  const name = `mediamtx_${VERSION}_${os}_${arch}.${ext}`;
  const url = `https://github.com/bluenviron/mediamtx/releases/download/${VERSION}/${name}`;
  return { name, url, platform };
}

async function main() {
  if (existsSync(binaryPath) && process.env.MEDIAMTX_FORCE !== '1') {
    console.log(`MediaMTX already present at ${binaryPath}`);
    return;
  }

  const { name, url, platform } = detectAsset();
  if (platform === 'win32') {
    throw new Error(
      'Windows zip download is not implemented in this scaffold; use WSL or place the binary in apps/mediamtx/bin/mediamtx.exe',
    );
  }

  mkdirSync(binDir, { recursive: true });
  const archivePath = join(binDir, name);

  console.log(`Downloading ${name}…`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${url}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  writeFileSync(archivePath, buffer);

  execFileSync('tar', ['-xzf', archivePath, '-C', binDir, 'mediamtx'], {
    stdio: 'inherit',
  });
  rmSync(archivePath, { force: true });

  if (!existsSync(binaryPath)) {
    throw new Error(`Binary not found after extract: ${binaryPath}`);
  }

  chmodSync(binaryPath, 0o755);
  console.log(`MediaMTX ${VERSION} ready: ${binaryPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
