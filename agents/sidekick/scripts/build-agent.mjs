import { build } from 'esbuild';

// Bundle local TypeScript; keep native SDK packages external for job processes.
await build({
  entryPoints: ['server/livekit/agent.ts'],
  outfile: 'dist-agent/agent.js',
  bundle: true,
  packages: 'external',
  platform: 'node',
  target: 'node24',
  format: 'esm',
  sourcemap: true,
});
