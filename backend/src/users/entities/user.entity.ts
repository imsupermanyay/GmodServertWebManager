import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, OneToMany } from 'typeorm';
import { UserRole } from '../../common/enums';
import { Instance } from '../../instances/entities/instance.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, charset: 'utf8mb4', collation: 'utf8mb4_unicode_ci' })
  username: string;

  @Column({ charset: 'utf8mb4', collation: 'utf8mb4_unicode_ci' })
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.ADMIN,
  })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Instance, instance => instance.admin)
  instances: Instance[];

  @CreateDateColumn()
  createdAt: Date;
}
