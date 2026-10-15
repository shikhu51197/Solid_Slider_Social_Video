/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import solid from 'vite-plugin-solid'

export default defineConfig({
  plugins: [solid()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
    deps: {
      optimizer: {
        web: {
          include: ['solid-js']
        }
      }
    }
  },
  resolve: {
    conditions: ['development', 'browser']
  }
})

