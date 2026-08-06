import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Broker, Lead } from '../entities';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Lead, Broker])],
  providers: [LeadsService],
  controllers: [LeadsController],
})
export class LeadsModule {}
