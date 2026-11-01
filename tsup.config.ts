import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  // Unminified on purpose: consumers minify, and keeping the output readable
  // preserves the pure annotations that let bundlers tree-shake it.
  minify: false,
  external: ['react', 'react-dom'],
  splitting: false,
  sourcemap: true,
  clean: false,
  // Bundling drops module-level directives, so restore it: without it,
  // importing the input from a React Server Component fails on the first hook.
  banner: { js: "'use client';" },
});
