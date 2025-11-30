import * as esbuild from 'esbuild';
import { cp, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// These are served by CDN via importmap, so we don't need to bundle them.
const externalDependencies = [];

try {
    // Bundle the JavaScript/TypeScript code
        const buildVersion = Date.now().toString();
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
                'process.env.BUILD_VERSION': JSON.stringify(buildVersion),
                'process.env': '{}',
                'process': '{}'
            },
            loader: { '.tsx': 'tsx' }
        });

        // Hash the bundle for immutable caching & integrity.
        const bundlePath = 'dist/bundle.js';
        const bundleContent = await readFile(bundlePath);
        const shortHash = createHash('sha256').update(bundleContent).digest('hex').slice(0, 16);
        const sriHash = createHash('sha384').update(bundleContent).digest('base64');
        const hashedName = `bundle.${shortHash}.js`;
        await writeFile(`dist/${hashedName}`, bundleContent);
        // Remove original (avoid serving un-hashed asset accidentally)
        // Using fs promises unlink would require import; simpler: keep original if delete fails gracefully.
        try { await (await import('node:fs/promises')).unlink(bundlePath); } catch {}

        // Copy static files to the output directory
        await cp('index.html', 'dist/index.html');
        await cp('index.css', 'dist/index.css');
        // Copy manifest and icons so nginx can serve them
        await cp('manifest.json', 'dist/manifest.json');
        // Copy env.js from public folder
        await cp('public/env.js', 'dist/env.js');
        // Copy CNAME for GitHub Pages custom domain
        await cp('public/CNAME', 'dist/CNAME');
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
        // Inject cache-busting query param and a global version console log so we can verify deployment.
        html = html.replace(/<script[^>]+src=["']\/index\.tsx["'][^>]*>\s*<\/script>\s*/i,
            `<script>console.log('[FWardrobe] build version: ${buildVersion}, hash: ${shortHash}');</script>\n` +
            `<script type="module" src="${hashedName}" integrity="sha384-${sriHash}" crossorigin="anonymous"></script>`);

        // Convert absolute asset paths to relative for GCS static hosting
        // Ensure env.js, CSS, manifest, icons use relative paths.
        html = html.replace(/src=["']\/env\.js["']/g, "src=\"env.js\"");
        html = html.replace(/href=["']\/index\.css["']/g, "href=\"index.css\"");
        html = html.replace(/href=["']\/manifest\.json["']/g, "href=\"manifest.json\"");
        html = html.replace(/href=["']\/icons\//g, "href=\"icons/");
        // Also adjust any other leading-slash asset references to be safe
        html = html.replace(/src=["']\/(?!https?:)/g, "src=\"");
        html = html.replace(/href=["']\/(?!https?:)/g, "href=\"");
        await writeFile('dist/build-meta.json', JSON.stringify({ buildVersion, shortHash, sriHash, hashedName, timestamp: new Date().toISOString() }, null, 2));
        await writeFile(htmlPath, html, { encoding: 'utf8' });
    await cp('metadata.json', 'dist/metadata.json');

    console.log('Build finished successfully!');
} catch (e) {
    console.error('Build failed:', e);
    // Re-throwing the error will cause the process to exit with a non-zero status code.
    // This replaces the problematic call to process.exit(1) which was causing a type error.
    throw e;
}
