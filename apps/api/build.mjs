import { build } from 'esbuild';

const common = {
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  sourcemap: true,
  packages: 'bundle',
  external: ['pg-native', '@electric-sql/pglite'],
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" }
};

await build({ ...common, entryPoints: ['src/server.ts'], outfile: 'dist/server.js' });
await build({ ...common, entryPoints: ['src/vercel.ts'], outfile: 'dist/vercel.js' });
await build({ ...common, entryPoints: ['src/scripts/migrate.ts'], outfile: 'dist/migrate.js' });
console.log('API build completata');
