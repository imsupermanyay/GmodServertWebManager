import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Repo } from './repo.entity';
import { Instance } from './instance.entity';

@Entity('bindings')
@Index(['repo_id', 'branch', 'instance_id'], { unique: true }) // 防止重复绑定
export class Binding {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  repo_id: number;

  @Column({ length: 100 })
  branch: string;

  @Column()
  instance_id: number;

  @Column({ default: true })
  enabled: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // 关联关系
  @ManyToOne(() => Repo, (repo) => repo.bindings)
  @JoinColumn({ name: 'repo_id' })
  repo: Repo;

  @ManyToOne(() => Instance, (instance) => instance.bindings)
  @JoinColumn({ name: 'instance_id' })
  instance: Instance;
}
