import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Distribution, DistributionBroker, Lead } from '../entities';
import { FormsService } from '../forms/forms.service';
import { CreateDistributionDto } from './dto/create-distribution.dto';
import { SetBrokersDto } from './dto/set-brokers.dto';

/** Exact copy required by the exam when a distribution precedes a form. */
export const NO_FORM_MESSAGE = 'Oops, please create a form first.';

@Injectable()
export class DistributionsService {
  constructor(
    @InjectRepository(Distribution)
    private readonly distributions: Repository<Distribution>,
    @InjectRepository(DistributionBroker)
    private readonly members: Repository<DistributionBroker>,
    @InjectRepository(Lead) private readonly leads: Repository<Lead>,
    private readonly forms: FormsService,
  ) {}

  findOne(): Promise<Distribution | null> {
    return this.distributions.findOne({
      where: { singleton: true },
      relations: { form: true, brokers: { broker: true } },
    });
  }

  async create(dto: CreateDistributionDto): Promise<Distribution> {
    const form = await this.forms.findOne();

    // Checked before the singleton check: with no form at all, the exam wants
    // this specific message rather than "already exists".
    if (!form) throw new BadRequestException(NO_FORM_MESSAGE);

    const existing = await this.distributions.findOne({
      where: { singleton: true },
    });

    if (existing) {
      throw new ConflictException(
        'A distribution already exists. Only one is allowed.',
      );
    }

    const distribution = await this.distributions.save(
      this.distributions.create({
        name: dto.name ?? 'Default distribution',
        formId: form.id,
        singleton: true,
        isActive: true,
      }),
    );

    if (dto.brokerIds?.length) {
      await this.members.save(
        dto.brokerIds.map((brokerId) =>
          this.members.create({
            distributionId: distribution.id,
            brokerId,
            percentage: 0,
            isActive: true,
          }),
        ),
      );
    }

    return (await this.findOne()) ?? distribution;
  }

  async setBrokers(id: number, dto: SetBrokersDto): Promise<Distribution> {
    const distribution = await this.distributions.findOne({ where: { id } });
    if (!distribution) throw new NotFoundException('Distribution not found');

    const keepIds = dto.brokers.map((entry) => entry.brokerId);

    // Drop members no longer selected, then upsert the rest.
    const current = await this.members.find({ where: { distributionId: id } });
    const removed = current.filter((m) => !keepIds.includes(m.brokerId));
    if (removed.length) {
      await this.members.delete({ id: In(removed.map((m) => m.id)) });
    }

    for (const entry of dto.brokers) {
      const existing = current.find((m) => m.brokerId === entry.brokerId);

      if (existing) {
        existing.percentage = entry.percentage;
        existing.isActive = entry.isActive ?? existing.isActive;
        await this.members.save(existing);
      } else {
        await this.members.save(
          this.members.create({
            distributionId: id,
            brokerId: entry.brokerId,
            percentage: entry.percentage,
            isActive: entry.isActive ?? true,
          }),
        );
      }
    }

    return (await this.findOne()) as Distribution;
  }

  /** Every lead that passed through the distribution, whatever its status. */
  async findLeads(id: number): Promise<Lead[]> {
    const distribution = await this.distributions.findOne({ where: { id } });
    if (!distribution) throw new NotFoundException('Distribution not found');

    return this.leads.find({
      where: { distributionId: id },
      relations: { broker: true },
      order: { createdAt: 'DESC', id: 'DESC' },
    });
  }
}
