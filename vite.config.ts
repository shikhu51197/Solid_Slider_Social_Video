/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite'
import solid from 'vite-plugin-solid'
import { socialApiPlugin } from './src/server/viteSocialApiPlugin'

export default defineConfig(({ mode }) => {
  // Load all environment variables (including private ones without VITE_ prefix)
  const env = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, env);

  return {
    plugins: [solid(), socialApiPlugin()],
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/setupTests.ts'],
      deps: {
        optimizer: {
          client: {
            include: ['solid-js']
          }
        }
      }
    },
    resolve: {
      conditions: ['development', 'browser']
    }
  };
})

