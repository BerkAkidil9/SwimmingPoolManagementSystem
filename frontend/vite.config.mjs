import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const frontendDir = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig(({ mode }) => {
  // Keep the existing deployment variables; expose only the public CRA prefix.
  const publicEnv = {
    REACT_APP_API_URL: '',
    REACT_APP_STRIPE_PUBLISHABLE_KEY: '',
    ...loadEnv(mode, frontendDir, 'REACT_APP_'),
  };
  const env = loadEnv(mode, frontendDir, ['PORT', 'PUBLIC_URL']);

  return {
    plugins: [react()],
    base: env.PUBLIC_URL || '/',
    define: Object.fromEntries(
      Object.entries(publicEnv).map(([key, value]) => [
        `process.env.${key}`, JSON.stringify(value),
      ]),
    ),
    server: { port: Number(env.PORT) || 3000 },
    preview: { port: 3000 },
    build: {
      outDir: 'build',
      manifest: true,
    },
  };
});
