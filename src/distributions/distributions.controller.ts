import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { DistributionsService } from './distributions.service';
import { CreateDistributionDto } from './dto/create-distribution.dto';
import { SetBrokersDto } from './dto/set-brokers.dto';
import { Distribution, Lead } from '../entities';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import type { Paginated } from '../common/paginated';

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
  findLeads(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: PaginationQueryDto,
  ): Promise<Paginated<Lead>> {
    return this.distributions.findLeads(id, query);
  }
}
