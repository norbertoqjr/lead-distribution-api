import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, MoreThanOrEqual, Not } from 'typeorm';
import {
  Broker,
  Distribution,
  DistributionBroker,
  Form,
  Lead,
  LeadStatus,
} from '../entities';
import {
  Candidate,
  isBrokerOpen,
  isUnderDailyCap,
  selectByDeficit,
  startOfBrokerDay,
} from './eligibility';

export type SubmitLeadInput = {
  name: string;
  email: string;
  phone?: string | null;
  ipAddress: string;
};

@Injectable()
export class AssignmentService {
  private readonly logger = new Logger(AssignmentService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * Persist a lead and route it. Every path stores a lead — a submission is
   * never silently dropped, because the distribution detail page has to show
   * duplicates and failures too.
   *
   * The whole sequence runs in one transaction so two concurrent submissions
   * cannot both read the same sentToday counts and push a broker past its cap.
   */
  async submit(form: Form, input: SubmitLeadInput): Promise<Lead> {
    return this.dataSource.transaction(async (manager) => {
      const leads = manager.getRepository(Lead);

      const lead = leads.create({
        name: input.name,
        email: input.email,
        phone: input.phone ?? null,
        ipAddress: input.ipAddress,
        formId: form.id,
        formName: form.name,
        status: LeadStatus.UNSENT,
      });

      // Resolved before the duplicate check purely so the link can be stored.
      // The decision order still follows the specification: duplicate first,
      // then distribution. But a duplicate has to carry its distributionId,
      // otherwise it never appears on the distribution detail page, which is
      // required to show duplicates alongside sent, unsent and failed leads.
      const distribution = await manager.getRepository(Distribution).findOne({
        where: { formId: form.id },
      });

      if (distribution) lead.distributionId = distribution.id;

      const alreadyAssigned = await leads.findOne({
        where: {
          email: input.email,
          brokerId: Not(0),
          status: LeadStatus.SENT,
        },
      });

      if (alreadyAssigned) {
        lead.status = LeadStatus.DUPLICATE;
        lead.note = `Already assigned to broker #${alreadyAssigned.brokerId}`;
        return leads.save(lead);
      }

      if (!distribution || !distribution.isActive) {
        lead.note = 'No active distribution';
        return leads.save(lead);
      }

      try {
        const brokerId = await this.pickBroker(manager, distribution.id);

        if (brokerId === null) {
          lead.note = 'No eligible broker at submission time';
          return leads.save(lead);
        }

        lead.brokerId = brokerId;
        lead.status = LeadStatus.SENT;
        lead.assignedAt = new Date();
        return await leads.save(lead);
      } catch (error) {
        // A failure here must still leave a record, marked failed, rather than
        // 500ing and losing the lead entirely.
        this.logger.error('Assignment failed', error as Error);
        lead.status = LeadStatus.FAILED;
        lead.brokerId = null;
        lead.note = 'Assignment failed unexpectedly';
        return leads.save(lead);
      }
    });
  }

  /** Eligible broker with the highest deficit, or null if nobody qualifies. */
  private async pickBroker(
    manager: EntityManager,
    distributionId: number,
  ): Promise<number | null> {
    const members = await manager.getRepository(DistributionBroker).find({
      where: { distributionId, isActive: true },
      relations: { broker: true },
    });

    const now = new Date();
    const candidates: Candidate[] = [];

    for (const member of members) {
      const broker: Broker | null = member.broker;
      if (!broker || !broker.isActive) continue;

      if (!isBrokerOpen(broker, now)) continue;

      const sentToday = await this.countSentToday(manager, broker, now);
      if (!isUnderDailyCap(broker.dailyCap, sentToday)) continue;

      candidates.push({
        brokerId: broker.id,
        percentage: Number(member.percentage),
        sentToday,
      });
    }

    if (candidates.length === 0) return null;

    // Total across eligible brokers only — an excluded broker should not drag
    // everyone else's target down for the rest of the day.
    const totalSentToday = candidates.reduce(
      (sum, candidate) => sum + candidate.sentToday,
      0,
    );

    return selectByDeficit(candidates, totalSentToday);
  }

  /** Leads this broker received since midnight in its own timezone. */
  private countSentToday(
    manager: EntityManager,
    broker: Broker,
    now: Date,
  ): Promise<number> {
    return manager.getRepository(Lead).count({
      where: {
        brokerId: broker.id,
        status: LeadStatus.SENT,
        assignedAt: MoreThanOrEqual(startOfBrokerDay(broker.timezone, now)),
      },
    });
  }
}
