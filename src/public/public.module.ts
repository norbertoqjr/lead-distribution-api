import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { FormsModule } from '../forms/forms.module';
import { DistributionModule } from '../distribution/distribution.module';

@Module({
  imports: [FormsModule, DistributionModule],
  controllers: [PublicController],
})
export class PublicModule {}
