import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { BrokersService } from './brokers.service';
import { CreateBrokerDto } from './dto/create-broker.dto';
import { UpdateBrokerDto } from './dto/update-broker.dto';
import { Broker, Lead } from '../entities';

@Controller('brokers')
export class BrokersController {
  constructor(private readonly brokers: BrokersService) {}

  @Get()
  findAll(): Promise<Broker[]> {
    return this.brokers.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Broker> {
    return this.brokers.findOne(id);
  }

  @Get(':id/leads')
  findLeads(@Param('id', ParseIntPipe) id: number): Promise<Lead[]> {
    return this.brokers.findLeads(id);
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
