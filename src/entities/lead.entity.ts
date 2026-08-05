import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Form } from './form.entity';
import { Distribution } from './distribution.entity';
import { Broker } from './broker.entity';

export enum LeadStatus {
  SENT = 'sent',
  UNSENT = 'unsent',
  DUPLICATE = 'duplicate',
  FAILED = 'failed',
}

@Entity('leads')
@Index(['email'])
@Index(['status'])
@Index(['brokerId', 'assignedAt'])
export class Lead {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  /** Stored already normalized: trimmed and lowercased. */
  @Column()
  email!: string;

  @Column({ type: 'varchar', nullable: true })
  phone!: string | null;

  @Column({ name: 'ip_address' })
  ipAddress!: string;

  @Column({ name: 'form_id', type: 'int', nullable: true })
  formId!: number | null;

  @Column({ name: 'form_name' })
  formName!: string;

  @Column({ name: 'distribution_id', type: 'int', nullable: true })
  distributionId!: number | null;

  @Column({ name: 'broker_id', type: 'int', nullable: true })
  brokerId!: number | null;

  @Column({ type: 'enum', enum: LeadStatus, default: LeadStatus.UNSENT })
  status!: LeadStatus;

  /** When a broker actually received it — null while unsent. */
  @Column({ name: 'assigned_at', type: 'datetime', nullable: true })
  assignedAt!: Date | null;

  /** Why a lead is duplicate or failed, shown on the distribution detail page. */
  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @ManyToOne(() => Form, (form) => form.leads, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'form_id' })
  form!: Form | null;

  @ManyToOne(() => Distribution, (d) => d.leads, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'distribution_id' })
  distribution!: Distribution | null;

  @ManyToOne(() => Broker, (b) => b.leads, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'broker_id' })
  broker!: Broker | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
