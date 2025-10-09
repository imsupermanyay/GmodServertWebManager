import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('audits')
export class Audit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  actor_user_id: number; // nullable 因为可能是系统操作或 webhook

  @Column({ length: 100 })
  action: string; // CREATE_INSTANCE, START_INSTANCE, BIND_REPO, WEBHOOK_RECEIVED 等

  @Column({ length: 50, nullable: true })
  target_type: string; // instance, repo, binding 等

  @Column({ nullable: true })
  target_id: number;

  @Column({ type: 'json', nullable: true })
  payload: any; // 详细信息

  @CreateDateColumn()
  created_at: Date;

  // 关联关系
  @ManyToOne(() => User, (user) => user.audits, { nullable: true })
  @JoinColumn({ name: 'actor_user_id' })
  actor: User;
}
