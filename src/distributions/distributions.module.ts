import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Distribution, DistributionBroker, Lead } from '../entities';
import { DistributionsService } from './distributions.service';
import { DistributionsController } from './distributions.controller';
import { FormsModule } from '../forms/forms.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Distribution, DistributionBroker, Lead]),
    FormsModule,
  ],
  providers: [DistributionsService],
  controllers: [DistributionsController],
  exports: [DistributionsService],
})
export class DistributionsModule {}
