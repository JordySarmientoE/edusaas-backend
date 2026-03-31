import 'dotenv/config';
import { join } from 'node:path';
import { DataSource } from 'typeorm';

const migrationsGlob = join(__dirname, '..', 'migrations', '*.{ts,js}');
const entitiesGlob = join(__dirname, '..', '**', 'entities', '*.entity.{ts,js}');

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_SSL === 'true'
      ? {
          rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false'
        }
      : false,
  synchronize: false,
  logging: false,
  entities: [entitiesGlob],
  migrations: [migrationsGlob]
});
