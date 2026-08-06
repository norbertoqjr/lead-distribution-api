import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { BrokersService } from './brokers.service';
import { CreateBrokerDto } from './dto/create-broker.dto';
import { UpdateBrokerDto } from './dto/update-broker.dto';
import { Broker, Lead } from '../entities';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import type { Paginated } from '../common/paginated';

@Controller('brokers')
export class BrokersController {
  constructor(private readonly brokers: BrokersService) {}

  @Get()
  findAll(@Query() query: PaginationQueryDto): Promise<Paginated<Broker>> {
    return this.brokers.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Broker> {
    return this.brokers.findOne(id);
  }

  @Get(':id/leads')
  findLeads(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: PaginationQueryDto,
  ): Promise<Paginated<Lead>> {
    return this.brokers.findLeads(id, query);
  }

  @Post()
  create(@Body() dto: CreateBrokerDto): Promise<Broker> {
    return this.brokers.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBrokerDto,
  ): Promise<Broker> {
    return this.brokers.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<{ ok: true }> {
    return this.brokers.remove(id);
  }
}
