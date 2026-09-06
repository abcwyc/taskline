import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
   resolve: {
      alias: {
         '@': resolve(__dirname, '.'),
         // let node tests import server-only modules
         'server-only': resolve(__dirname, 'test/stubs/empty.ts'),
      },
   },
   test: {
      environment: 'node',
      include: ['test/**/*.test.ts'],
      // integration tests self-skip unless TEST_DATABASE_URL is set
   },
});
