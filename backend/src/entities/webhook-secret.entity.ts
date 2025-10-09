import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Repo } from './repo.entity';

@Entity('webhook_secrets')
export class WebhookSecret {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  repo_id: number;

  @Column({ length: 255 })
  secret: string;

  // 关联关系
  @OneToOne(() => Repo, (repo) => repo.webhook_secret)
  @JoinColumn({ name: 'repo_id' })
  repo: Repo;
}
