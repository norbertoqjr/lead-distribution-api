import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Form } from './form.entity';
import { DistributionBroker } from './distribution-broker.entity';
import { Lead } from './lead.entity';

/** The single distribution, always attached to the single form. */
@Entity('distributions')
export class Distribution {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ default: 'Default distribution' })
  name!: string;

  @Column({ name: 'form_id', unique: true })
  formId!: number;

  @Column({ unique: true, default: true })
  singleton!: boolean;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @OneToOne(() => Form, (form) => form.distribution, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'form_id' })
  form!: Form;

  @OneToMany(() => DistributionBroker, (db) => db.distribution)
  brokers!: DistributionBroker[];

  @OneToMany(() => Lead, (lead) => lead.distribution)
  leads!: Lead[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
