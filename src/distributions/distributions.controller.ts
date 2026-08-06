import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { DistributionsService } from './distributions.service';
import { CreateDistributionDto } from './dto/create-distribution.dto';
import { SetBrokersDto } from './dto/set-brokers.dto';
import { Distribution, Lead } from '../entities';

@Controller('distributions')
export class DistributionsController {
  constructor(private readonly distributions: DistributionsService) {}

  @Get()
  findOne(): Promise<Distribution | null> {
    return this.distributions.findOne();
  }

  @Post()
  create(@Body() dto: CreateDistributionDto): Promise<Distribution> {
    return this.distributions.create(dto);
  }

  @Patch(':id/brokers')
  setBrokers(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetBrokersDto,
  ): Promise<Distribution> {
    return this.distributions.setBrokers(id, dto);
  }

  @Get(':id/leads')
  findLeads(@Param('id', ParseIntPipe) id: number): Promise<Lead[]> {
    return this.distributions.findLeads(id);
  }
}
