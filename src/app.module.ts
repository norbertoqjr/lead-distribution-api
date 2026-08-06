import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import Joi from 'joi';
import { DatabaseModule } from './database/database.module';
import { AppController } from './app.controller';
import { HealthController } from './health/health.controller';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { BrokersModule } from './brokers/brokers.module';
import { FormsModule } from './forms/forms.module';
import { DistributionsModule } from './distributions/distributions.module';
import { DistributionModule } from './distribution/distribution.module';
import { LeadsModule } from './leads/leads.module';
import { PublicModule } from './public/public.module';

@Module({
  imports: [
    // Validating here means a missing secret fails at boot with a clear
    // message, rather than surfacing as a confusing 500 later.
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        PORT: Joi.number().default(8193),
        HOST: Joi.string().default('127.0.0.1'),
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().min(16).required(),
        JWT_EXPIRES_IN: Joi.string().default('7d'),
        SESSION_COOKIE_NAME: Joi.string().default('lds_session'),
        CORS_ORIGIN: Joi.string().default('http://localhost:8192'),
        ADMIN_EMAIL: Joi.string().email().required(),
        ADMIN_PASSWORD: Joi.string().min(8).required(),
        TRUST_PROXY: Joi.string().valid('true', 'false').default('false'),
      }),
    }),
    DatabaseModule,
    AuthModule,
    BrokersModule,
    FormsModule,
    DistributionsModule,
    DistributionModule,
    LeadsModule,
    PublicModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    // Global by default: a new route is protected unless it opts out with
    // @Public(). Forgetting the decorator locks a route down rather than
    // exposing it.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
