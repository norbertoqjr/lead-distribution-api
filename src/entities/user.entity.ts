import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/** Admin accounts. Only admins authenticate; leads are anonymous. */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  email!: string;

  // select: false keeps the hash out of every default query, so it cannot be
  // returned by accident.
  @Column({ name: 'password_hash', select: false })
  passwordHash!: string;

  @Column({ nullable: true, type: 'varchar' })
  name!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
