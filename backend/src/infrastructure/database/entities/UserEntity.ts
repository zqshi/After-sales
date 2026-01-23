import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class UserEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100, nullable: true, unique: true })
  email!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true, unique: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 200 })
  passwordHash!: string;

  @Column({ name: 'password_salt', type: 'varchar', length: 100 })
  passwordSalt!: string;

  @Column({ name: 'password_algo', type: 'varchar', length: 50, default: 'pbkdf2-sha512' })
  passwordAlgo!: string;

  @Column({ name: 'password_iterations', type: 'int', default: 120000 })
  passwordIterations!: number;

  @Column({ type: 'varchar', length: 20, default: 'agent' })
  role!: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: string;

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt!: Date | null;

  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
