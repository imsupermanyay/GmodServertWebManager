import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, OneToMany } from 'typeorm';
import { UserRole } from '../../common/enums';
import { Instance } from '../../instances/entities/instance.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'varchar',
    length: 255,
    unique: true,
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
    nullable: false
  })
  username: string;

  @Column({
    type: 'varchar',
    length: 255,
    charset: 'utf8mb4',
    collation: 'utf8mb4_unicode_ci',
    nullable: false
  })
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.ADMIN,
    nullable: false
  })
  role: UserRole;

  @Column({
    type: 'boolean',
    default: true,
    nullable: false
  })
  isActive: boolean;

  @OneToMany(() => Instance, instance => instance.admin)
  instances: Instance[];

  @CreateDateColumn()
  createdAt: Date;
}
