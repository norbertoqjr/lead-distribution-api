import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Broker, Lead } from '../entities';
import { CreateBrokerDto } from './dto/create-broker.dto';
import { UpdateBrokerDto } from './dto/update-broker.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { paginate, resolvePaging, type Paginated } from '../common/paginated';

@Injectable()
export class BrokersService {
  constructor(
    @InjectRepository(Broker) private readonly brokers: Repository<Broker>,
    @InjectRepository(Lead) private readonly leads: Repository<Lead>,
  ) {}

  async findAll(query: PaginationQueryDto = {}): Promise<Paginated<Broker>> {
    const { page, perPage, skip, take } = resolvePaging(query);

    const [data, total] = await this.brokers.findAndCount({
      order: { name: 'ASC' },
      skip,
      take,
    });

    return paginate(data, total, page, perPage);
  }

  async findOne(id: number): Promise<Broker> {
    const broker = await this.brokers.findOne({ where: { id } });
    if (!broker) throw new NotFoundException('Broker not found');
    return broker;
  }

  create(dto: CreateBrokerDto): Promise<Broker> {
    return this.brokers.save(
      this.brokers.create({
        ...dto,
        isActive: dto.isActive ?? true,
        workingDays: dto.workingDays.sort((a, b) => a - b).join(','),
      }),
    );
  }

  async update(id: number, dto: UpdateBrokerDto): Promise<Broker> {
    const broker = await this.findOne(id);

    Object.assign(broker, {
      ...dto,
      workingDays: dto.workingDays
        ? dto.workingDays.sort((a, b) => a - b).join(',')
        : broker.workingDays,
    });

    return this.brokers.save(broker);
  }

  async remove(id: number): Promise<{ ok: true }> {
    await this.findOne(id);
    // Leads keep their history: the FK is ON DELETE SET NULL.
    await this.brokers.delete(id);
    return { ok: true };
  }

  /** Leads this broker received, newest first. */
  async findLeads(
    id: number,
    query: PaginationQueryDto = {},
  ): Promise<Paginated<Lead>> {
    await this.findOne(id);

    const { page, perPage, skip, take } = resolvePaging(query);

    const [data, total] = await this.leads.findAndCount({
      where: { brokerId: id },
      order: { assignedAt: 'DESC', id: 'DESC' },
      skip,
      take,
    });

    return paginate(data, total, page, perPage);
  }
}
