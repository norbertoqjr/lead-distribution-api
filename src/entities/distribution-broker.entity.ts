import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Distribution } from './distribution.entity';
import { Broker } from './broker.entity';

@Entity('distribution_brokers')
@Unique(['distributionId', 'brokerId'])
@Index(['brokerId'])
export class DistributionBroker {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'distribution_id' })
  distributionId!: number;

  @Column({ name: 'broker_id' })
  brokerId!: number;

  /**
   * Target share of leads, 0-100. Stored as DECIMAL so percentages stay exact;
   * the transformer converts to a number since mysql2 returns decimals as
   * strings.
   */
  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string | null) => (value === null ? 0 : Number(value)),
    },
  })
  percentage!: number;

  /** Active within this distribution, independent of the broker's own flag. */
  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @ManyToOne(() => Distribution, (d) => d.brokers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'distribution_id' })
  distribution!: Distribution;

  @ManyToOne(() => Broker, (b) => b.distributionBrokers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'broker_id' })
  broker!: Broker;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
