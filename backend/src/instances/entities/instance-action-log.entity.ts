import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

export enum InstanceAction {
  START = 'start',
  STOP = 'stop',
}

@Entity('instance_action_logs')
export class InstanceActionLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  instanceId: number;

  @Column({ type: 'enum', enum: InstanceAction })
  action: InstanceAction;

  @CreateDateColumn()
  createdAt: Date;
}
