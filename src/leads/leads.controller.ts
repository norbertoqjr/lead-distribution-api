import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { LeadsService } from './leads.service';
import { AssignLeadDto } from './dto/assign-lead.dto';
import { QueryLeadsDto } from './dto/query-leads.dto';
import { Lead, LeadStatus } from '../entities';
import type { Paginated } from '../common/paginated';

@Controller('leads')
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Get()
  findAll(@Query() query: QueryLeadsDto): Promise<Paginated<Lead>> {
    return this.leads.findAll(query);
  }

  @Get('summary')
  summary(): Promise<Record<LeadStatus | 'total', number>> {
    return this.leads.summary();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Lead> {
    return this.leads.findOne(id);
  }

  @Post(':id/assign')
  assign(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignLeadDto,
  ): Promise<Lead> {
    return this.leads.assign(id, dto.brokerId);
  }
}
