// Construit dist/ (fichiers séparés) puis dist-single/index.html (un seul fichier autonome).
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
// VITRINE=1 bun build.ts : version publique sans prix, panier, commande ni administration -> dist-vitrine/
const VITRINE = process.env.VITRINE === '1';
const SINGLE = VITRINE ? 'dist-vitrine' : 'dist-single';
rmSync('dist', { recursive: true, force: true });
rmSync(SINGLE, { recursive: true, force: true });
const r = await Bun.build({ entrypoints: ['./index.html'], outdir: './dist', minify: true, define: { 'process.env.NODE_ENV': '"production"', __DIONDA_VITRINE__: VITRINE ? 'true' : 'false' } });
if (!r.success) { for (const l of r.logs) console.error(l); process.exit(1); }
const html = readFileSync('dist/index.html', 'utf8');
let single = html;
for (const f of readdirSync('dist')) {
  if (f.endsWith('.js')) single = single.replace(new RegExp(`<script[^>]*src="[^"]*${f}"[^>]*></script>`), () => `<script type="module">${readFileSync('dist/' + f, 'utf8').replace(/<\/script/g, '<\\/script')}</script>`);
  if (f.endsWith('.css')) single = single.replace(new RegExp(`<link[^>]*href="[^"]*${f}"[^>]*>`), () => `<style>${readFileSync('dist/' + f, 'utf8')}</style>`);
}
mkdirSync(SINGLE, { recursive: true });
writeFileSync(SINGLE + '/index.html', single);
// Dossier public/ (photos…) copié à côté de index.html dans les deux versions.
if (existsSync('public')) {
  cpSync('public', 'dist', { recursive: true });
  cpSync('public', SINGLE, { recursive: true });
}
console.log('OK', r.outputs.map((o) => o.path.split('/').pop() + ' ' + Math.round(o.size / 1024) + ' Ko').join(', '), '| fichier unique', Math.round(single.length / 1024), 'Ko');
