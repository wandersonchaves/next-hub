const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Determine candidate paths for standalone server.js in monorepo or isolated environment
const candidates = [
  path.join(__dirname, '.next/standalone/apps/web/server.js'),
  path.join(__dirname, '.next/standalone/server.js'),
  path.join(process.cwd(), '.next/standalone/apps/web/server.js'),
  path.join(process.cwd(), '.next/standalone/server.js'),
  path.join(process.cwd(), 'server.js'),
];

const target = candidates.find((file) => fs.existsSync(file));

const port = process.env.PORT || '3000';
const hostname = process.env.HOSTNAME || '0.0.0.0';

if (target) {
  console.log(`[Next.js Runner] Starting standalone server from: ${target} on ${hostname}:${port}`);
  const child = spawn(process.execPath, [target], {
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
  console.log(`[Next.js Runner] Standalone server not found in candidates. Falling back to 'next start' on ${hostname}:${port}...`);
  const nextBin = require.resolve('next/dist/bin/next');
  const child = spawn(process.execPath, [nextBin, 'start', '-p', port, '-H', hostname], {
    stdio: 'inherit',
    env: process.env,
  });

  child.on('exit', (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    process.exit(code ?? 0);
  });
}
