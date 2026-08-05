import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

type Welcome = {
  name: string;
  status: string;
  database: string;
  docs: string;
};

/**
 * Root route. Excluded from the global `/api` prefix in main.ts so hitting the
 * bare host during development shows something useful instead of a 404.
 */
@Controller()
export class AppController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get()
  async welcome(): Promise<Welcome> {
    let database = 'down';

    try {
      await this.dataSource.query('SELECT 1');
      database = 'up';
    } catch {
      // Reported as down rather than thrown: the root route should answer
      // even when the database is unreachable, so it can say so.
    }

    return {
      name: 'Lead Distribution Platform API',
      status: database === 'up' ? 'ok' : 'degraded',
      database,
      docs: '/api/health',
    };
  }
}
