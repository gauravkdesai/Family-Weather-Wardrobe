import * as esbuild from 'esbuild';
import { cp } from 'node:fs/promises';

// These are served by CDN via importmap, so we don't need to bundle them.
const externalDependencies = [
    'react',
    'react-dom/*',
];

try {
    // Bundle the JavaScript/TypeScript code
    await esbuild.build({
      entryPoints: ['index.tsx'],
      bundle: true,
      outfile: 'dist/bundle.js',
      minify: true,
      format: 'esm',
      sourcemap: true,
      external: externalDependencies,
      // esbuild needs to know how to handle JSX syntax in .tsx files
      loader: {
          '.tsx': 'tsx'
      }
    });

    // Copy static files to the output directory
    await cp('index.html', 'dist/index.html');
    await cp('metadata.json', 'dist/metadata.json');

    console.log('Build finished successfully!');
} catch (e) {
    console.error('Build failed:', e);
    // Re-throwing the error will cause the process to exit with a non-zero status code.
    // This replaces the problematic call to process.exit(1) which was causing a type error.
    throw e;
}
