import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';
import * as entities from '../entities';

loadEnv();

/**
 * Standalone DataSource for the TypeORM CLI (migrations, seeds). The running
 * app configures its connection through TypeOrmModule in app.module.ts, but
 * both read the same DATABASE_URL so they can never drift apart.
 */
export const AppDataSource = new DataSource({
  type: 'mysql',
  url: process.env.DATABASE_URL,
  entities: Object.values(entities).filter(
    (value) => typeof value === 'function',
  ) as Function[],
  migrations: ['src/database/migrations/*.ts'],
  // Never true. Schema changes go through reviewed migrations so the VPS
  // database cannot be silently restructured on boot.
  synchronize: false,
  timezone: 'Z',
  logging:
    process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

// Single export only — the TypeORM CLI rejects a file exporting more than one
// DataSource, and a default alias counts as a second.
