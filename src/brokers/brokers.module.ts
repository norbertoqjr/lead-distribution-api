import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Broker, Lead } from '../entities';
import { BrokersService } from './brokers.service';
import { BrokersController } from './brokers.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Broker, Lead])],
  providers: [BrokersService],
  controllers: [BrokersController],
  exports: [BrokersService],
})
export class BrokersModule {}
