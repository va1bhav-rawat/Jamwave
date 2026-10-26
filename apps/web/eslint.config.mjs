import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
  {
    rules: {
      // Thumbnails come from YouTube's CDN; plain <img> avoids the image optimizer for them.
      '@next/next/no-img-element': 'off',
    },
  },
]);

export default eslintConfig;
