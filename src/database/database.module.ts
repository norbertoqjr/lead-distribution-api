import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as entities from '../entities';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql' as const,
        url: config.get<string>('DATABASE_URL'),
        entities: Object.values(entities).filter(
          (value) => typeof value === 'function',
        ) as Function[],
        synchronize: false,
        // Connections are handed out in UTC; broker-local hours are derived
        // per broker from its own timezone, never from the connection.
        timezone: 'Z',
        logging:
          config.get<string>('NODE_ENV') === 'development'
            ? (['error', 'warn'] as const)
            : (['error'] as const),
      }),
    }),
  ],
})
export class DatabaseModule {}
