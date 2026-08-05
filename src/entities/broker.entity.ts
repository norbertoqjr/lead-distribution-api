import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DistributionBroker } from './distribution-broker.entity';
import { Lead } from './lead.entity';

@Entity('brokers')
export class Broker {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'daily_cap', type: 'int', default: 0 })
  dailyCap!: number;

  /** IANA zone, e.g. Asia/Manila. All availability maths uses this, not the server clock. */
  @Column({ default: 'UTC' })
  timezone!: string;

  /** Minutes from midnight in the broker's own timezone: 540 = 09:00. */
  @Column({ name: 'open_minute', type: 'int', default: 0 })
  openMinute!: number;

  @Column({ name: 'close_minute', type: 'int', default: 1440 })
  closeMinute!: number;

  /** ISO weekdays worked, 1 = Monday .. 7 = Sunday, e.g. "1,2,3,4,5". */
  @Column({ name: 'working_days', default: '1,2,3,4,5' })
  workingDays!: string;

  @OneToMany(() => DistributionBroker, (db) => db.broker)
  distributionBrokers!: DistributionBroker[];

  @OneToMany(() => Lead, (lead) => lead.broker)
  leads!: Lead[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
