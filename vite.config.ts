import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // Ohne das liefert `?raw` bei CSS-Dateien leeren Text.
    css: true,
    environment: 'node',
    setupFiles: ['./src/testaufbau.ts'],
  },
});
