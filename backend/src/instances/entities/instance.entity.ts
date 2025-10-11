import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { InstanceStatus } from '../../common/enums';
import { User } from '../../users/entities/user.entity';

@Entity('instances')
export class Instance {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, charset: 'utf8mb4', collation: 'utf8mb4_unicode_ci' })
  name: string;

  @Column({ nullable: true })
  dockerId: string;

  @Column({ nullable: true })
  containerName: string;

  @Column({
    type: 'enum',
    enum: InstanceStatus,
    default: InstanceStatus.STOPPED,
  })
  status: InstanceStatus;

  @Column({ nullable: true })
  hostDirectory: string;

  @Column({ nullable: true })
  containerDirectory: string;

  @Column({ nullable: true })
  adminId: number;

  @ManyToOne(() => User, user => user.instances, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'adminId' })
  admin: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
