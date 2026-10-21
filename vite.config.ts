import { defineConfig, loadEnv } from 'vite'
import solid from 'vite-plugin-solid'
import { socialApiPlugin } from './src/server/viteSocialApiPlugin.ts'

export default defineConfig(({ mode }) => {
  // Load all environment variables (including private ones without VITE_ prefix)
  const env = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, env);

  return {
    plugins: [solid(), socialApiPlugin()],
    envPrefix: 'PUBLIC_',
    resolve: {
      conditions: ['development', 'browser']
    }
  };
})

