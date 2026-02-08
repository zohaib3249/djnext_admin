/**
 * After `next build` with output: 'export', the build is in out/.
 * This script writes build-manifest.json listing entry HTML and asset paths
 * so Django (or any server) can inject script/link tags if not serving out/index.html directly.
 *
 * Usage: node scripts/post-build-manifest.js
 * Run after: npm run build
 */

const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'out');
const indexPath = path.join(outDir, 'index.html');

if (!fs.existsSync(indexPath)) {
  console.warn('scripts/post-build-manifest.js: out/index.html not found. Run "npm run build" first.');
  process.exit(0);
}

const html = fs.readFileSync(indexPath, 'utf8');
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const scripts = [];
const styles = [];

// Extract script src (e.g. _next/static/chunks/...)
const scriptRe = /<script[^>]+src="([^"]+)"[^>]*>/g;
let m;
while ((m = scriptRe.exec(html)) !== null) {
  const src = m[1];
  if (src.includes('_next/')) scripts.push(src.startsWith('/') ? src : `/${src}`);
}

// Extract link rel=stylesheet href
const linkRe = /<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"[^>]*>/g;
while ((m = linkRe.exec(html)) !== null) {
  const href = m[1];
  if (href.includes('_next/') || href.endsWith('.css')) styles.push(href.startsWith('/') ? href : `/${href}`);
}

const manifest = {
  basePath,
  entryHtml: basePath ? `${basePath}/index.html` : '/index.html',
  scripts,
  styles,
  generatedAt: new Date().toISOString(),
};

const manifestPath = path.join(outDir, 'build-manifest.json');
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
console.log('Wrote', manifestPath);
