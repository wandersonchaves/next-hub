const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const appDir = __dirname;
const port = process.env.PORT || '3000';
const hostname = process.env.HOSTNAME || '0.0.0.0';

// List of candidate paths for standalone server.js
const candidates = [
  path.join(appDir, '.next/standalone/apps/web/server.js'),
  path.join(appDir, '.next/standalone/server.js'),
  path.join(appDir, '../../.next/standalone/apps/web/server.js'),
  path.join(appDir, '../../.next/standalone/server.js'),
  path.join(process.cwd(), '.next/standalone/apps/web/server.js'),
  path.join(process.cwd(), '.next/standalone/server.js'),
  path.join(process.cwd(), 'apps/web/.next/standalone/apps/web/server.js'),
  path.join(process.cwd(), 'apps/web/.next/standalone/server.js'),
  path.join(process.cwd(), 'server.js'),
];

let target = candidates.find((file) => fs.existsSync(file));

// Self-healing fallback: If neither standalone nor BUILD_ID exists, trigger an automatic on-the-fly build
if (!target && !fs.existsSync(path.join(appDir, '.next/BUILD_ID'))) {
  console.log('[Next.js Runner] No build artifacts (.next/BUILD_ID) found.');
  console.log('[Next.js Runner] Running automatic on-the-fly build to recover...');
  try {
    const buildRes = spawnSync('npx', ['next', 'build'], {
      cwd: appDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: 'production',
      },
    });

    if (buildRes.status === 0) {
      console.log('[Next.js Runner] On-the-fly build completed successfully.');
      target = candidates.find((file) => fs.existsSync(file));
    } else {
      console.error(`[Next.js Runner] On-the-fly build failed with exit code: ${buildRes.status}`);
    }
  } catch (err) {
    console.error('[Next.js Runner] Error executing on-the-fly build:', err);
  }
}

// Function to copy directory contents if destination does not exist
function copyDirIfMissing(src, dest) {
  if (fs.existsSync(src) && !fs.existsSync(dest)) {
    try {
      fs.mkdirSync(dest, { recursive: true });
      fs.cpSync(src, dest, { recursive: true });
    } catch (e) {
      console.warn(`[Next.js Runner] Could not copy ${src} to ${dest}:`, e.message);
    }
  }
}

if (target) {
  const targetDir = path.dirname(target);

  // Ensure static and public directories are present in the target directory
  const srcStatic = path.join(appDir, '.next/static');
  const destStatic = path.join(targetDir, '.next/static');
  copyDirIfMissing(srcStatic, destStatic);

  const srcPublic = path.join(appDir, 'public');
  const destPublic = path.join(targetDir, 'public');
  copyDirIfMissing(srcPublic, destPublic);

  console.log(`[Next.js Runner] Starting standalone server from: ${target} on ${hostname}:${port}`);
  const child = spawn(process.execPath, [target], {
    cwd: targetDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: port,
      HOSTNAME: hostname,
    },
  });

  child.on('exit', (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    process.exit(code ?? 0);
  });
} else {
  console.log(`[Next.js Runner] Standalone server not found. Falling back to 'next start' on ${hostname}:${port}...`);
  const nextBin = require.resolve('next/dist/bin/next');
  const child = spawn(process.execPath, [nextBin, 'start', '-p', port, '-H', hostname], {
    cwd: appDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: port,
      HOSTNAME: hostname,
    },
  });

  child.on('exit', (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    process.exit(code ?? 0);
  });
}
