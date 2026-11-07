import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base relative : le site fonctionne aussi sur GitHub Pages (sous-dossier) grâce au routage par hash.
export default defineConfig({
  define: { __DIONDA_VITRINE__: process.env.VITRINE === '1' ? 'true' : 'false' },
  plugins: [react()],
  base: './',
});
