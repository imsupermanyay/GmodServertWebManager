import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { Binding } from './binding.entity';
import { WebhookSecret } from './webhook-secret.entity';

@Entity('repos')
export class Repo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 100 })
  name: string;

  @Column({ length: 500 })
  gitea_http_url: string;

  @Column({ length: 500, nullable: true })
  gitea_ssh_url: string;

  @Column({ length: 100, default: 'main' })
  default_branch: string;

  @Column({ type: 'text', nullable: true })
  note: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // 关联关系
  @OneToMany(() => Binding, (binding) => binding.repo)
  bindings: Binding[];

  @OneToOne(() => WebhookSecret, (secret) => secret.repo)
  webhook_secret: WebhookSecret;
}
