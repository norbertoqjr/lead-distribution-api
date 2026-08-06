import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Broker, Lead, LeadStatus } from '../entities';
import { QueryLeadsDto } from './dto/query-leads.dto';
import { paginate, resolvePaging, type Paginated } from '../common/paginated';

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead) private readonly leads: Repository<Lead>,
    @InjectRepository(Broker) private readonly brokers: Repository<Broker>,
  ) {}

  async findAll(query: QueryLeadsDto): Promise<Paginated<Lead>> {
    const { page, perPage, skip, take } = resolvePaging(query);

    // findAndCount runs the rows and the total in one call, so the count
    // always matches the page that was just read.
    const [data, total] = await this.leads.findAndCount({
      where: query.status ? { status: query.status } : {},
      relations: { broker: true },
      order: { createdAt: 'DESC', id: 'DESC' },
      skip,
      take,
    });

    return paginate(data, total, page, perPage);
  }

  async findOne(id: number): Promise<Lead> {
    const lead = await this.leads.findOne({
      where: { id },
      relations: { broker: true },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  /** Counts for the dashboard, one query rather than four. */
  async summary(): Promise<Record<LeadStatus | 'total', number>> {
    const rows = await this.leads
      .createQueryBuilder('lead')
      .select('lead.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('lead.status')
      .getRawMany<{ status: LeadStatus; count: string }>();

    const summary = {
      total: 0,
      [LeadStatus.SENT]: 0,
      [LeadStatus.UNSENT]: 0,
      [LeadStatus.DUPLICATE]: 0,
      [LeadStatus.FAILED]: 0,
    };

    for (const row of rows) {
      const count = Number(row.count);
      summary[row.status] = count;
      summary.total += count;
    }

    return summary;
  }

  /**
   * Manual assignment for an unsent lead. Deliberately refuses duplicates:
   * routing an already-assigned email to a second broker is an automatic fail
   * condition, and the admin UI must not be able to do it either.
   */
  async assign(id: number, brokerId: number): Promise<Lead> {
    const lead = await this.findOne(id);

    if (lead.status === LeadStatus.DUPLICATE) {
      throw new BadRequestException(
        'A duplicate lead cannot be assigned to a broker',
      );
    }

    if (lead.status === LeadStatus.SENT) {
      throw new BadRequestException('This lead is already assigned');
    }

    const broker = await this.brokers.findOne({ where: { id: brokerId } });
    if (!broker) throw new NotFoundException('Broker not found');

    // Both sides must be set. The entity was loaded with its `broker`
    // relation, and TypeORM lets a stale relation object win over the raw
    // foreign key — setting only brokerId writes NULL, leaving a lead marked
    // sent with no broker attached.
    lead.broker = broker;
    lead.brokerId = broker.id;
    lead.status = LeadStatus.SENT;
    lead.assignedAt = new Date();
    lead.note = 'Manually assigned';

    await this.leads.save(lead);

    return this.findOne(id);
  }
}
