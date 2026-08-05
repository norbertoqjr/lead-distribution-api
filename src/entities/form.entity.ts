import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Distribution } from './distribution.entity';
import { Lead } from './lead.entity';

/**
 * The single lead form. `singleton` is always true and uniquely indexed, so
 * the database rejects a second row even if two requests race past the
 * service-level check.
 */
@Entity('forms')
export class Form {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ unique: true })
  slug!: string;

  @Column({ unique: true, default: true })
  singleton!: boolean;

  @OneToOne(() => Distribution, (distribution) => distribution.form)
  distribution!: Distribution | null;

  @OneToMany(() => Lead, (lead) => lead.form)
  leads!: Lead[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
