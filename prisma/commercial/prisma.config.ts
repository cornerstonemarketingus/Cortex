import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'schema.prisma',
  datasource: {
    url:
      process.env.COMMERCIAL_DATABASE_URL ??
      'postgresql://postgres:postgres@localhost:5432/cortex_commercial',
  },
});
