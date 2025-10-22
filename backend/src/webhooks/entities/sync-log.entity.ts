import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

export enum SyncStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  IN_PROGRESS = 'in_progress',
}

@Entity('sync_logs')
export class SyncLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  gamemodeName: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  repositoryName: string;

  @Column({
    type: 'enum',
    enum: SyncStatus,
    default: SyncStatus.IN_PROGRESS,
    nullable: false,
  })
  status: SyncStatus;

  @Column({
    type: 'text',
    nullable: true,
  })
  message: string;

  @Column({
    type: 'text',
    nullable: true,
  })
  errorDetails: string;

  @Column({
    type: 'boolean',
    default: false,
    nullable: false,
  })
  isManualSync: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @Column({
    type: 'datetime',
    nullable: true,
  })
  completedAt: Date;
}
