import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { JobType } from '../common/enums/job-type.enum';

@Entity('jobs')
export class Job {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: JobType,
  })
  type: JobType;

  @Column({ type: 'json' })
  payload: any;

  @Column({ length: 50, default: 'pending' })
  status: string; // pending, running, completed, failed

  @Column({ type: 'int', default: 0 })
  retry_count: number;

  @Column({ type: 'text', nullable: true })
  last_error: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
