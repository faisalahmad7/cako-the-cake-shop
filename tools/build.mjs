// Copies only the files the website needs into dist/ (ready to upload to Netlify / Cloudflare Pages / any host).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const ship = ['index.html', 'cakes.html', 'order.html', 'visit.html', 'favicon.svg', 'site.webmanifest', 'sitemap.xml', 'robots.txt', 'assets'];

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist);
let files = 0, bytes = 0;
// source files that are bundled into assets/css/site.css or only used to build: not uploaded
const skip = new Set([path.join(root, 'assets/css/src'), path.join(root, 'assets/css/parts')]);
const copy = (src, dst) => {
  if (skip.has(src) || src.endsWith('.json') && src.includes(path.join('assets', 'img') + path.sep) && !src.endsWith('manifest.json')) return;
  const st = fs.statSync(src);
  if (st.isDirectory()) { fs.mkdirSync(dst, { recursive: true }); for (const f of fs.readdirSync(src)) copy(path.join(src, f), path.join(dst, f)); }
  else { fs.copyFileSync(src, dst); files++; bytes += st.size; }
};
for (const item of ship) copy(path.join(root, item), path.join(dist, item));
console.log(`Built dist/ with ${files} files (${(bytes / 1024 / 1024).toFixed(2)} MB). Upload the dist folder to your host, or run: npm run preview`);
