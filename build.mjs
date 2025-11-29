import * as esbuild from 'esbuild';
import { cp, readFile, writeFile } from 'node:fs/promises';

// These are served by CDN via importmap, so we don't need to bundle them.
const externalDependencies = [];

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
            define: {
                'process.env.NODE_ENV': '"production"',
                'process.env': '{}',
                'process': '{}'
            },
            // esbuild needs to know how to handle JSX syntax in .tsx files
            loader: {
                    '.tsx': 'tsx'
            }
        });

        // Copy static files to the output directory
        await cp('index.html', 'dist/index.html');
        await cp('index.css', 'dist/index.css');
        // Copy manifest and icons so nginx can serve them
        await cp('manifest.json', 'dist/manifest.json');
        // Copy icons folder recursively if it exists
        try {
            await cp('icons', 'dist/icons', { recursive: true });
        } catch (e) {
            // Ignore if icons folder is missing for some setups
        }

        // Remove any development-only script tags (like importing /index.tsx) from the copied HTML
        // and replace them with a production bundle script tag so dist/index.html loads bundle.js.
        const htmlPath = 'dist/index.html';
        let html = await readFile(htmlPath, { encoding: 'utf8' });
        // Replace a script tag that imports /index.tsx (dev-only) with the bundled script for production.
        html = html.replace(/<script[^>]+src=["']\/index\.tsx["'][^>]*>\s*<\/script>\s*/i, '<script type="module" src="/bundle.js"></script>');
        await writeFile(htmlPath, html, { encoding: 'utf8' });
    await cp('metadata.json', 'dist/metadata.json');

    console.log('Build finished successfully!');
} catch (e) {
    console.error('Build failed:', e);
    // Re-throwing the error will cause the process to exit with a non-zero status code.
    // This replaces the problematic call to process.exit(1) which was causing a type error.
    throw e;
}
