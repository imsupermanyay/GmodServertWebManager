import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { InstanceStatus } from '../common/enums/instance-status.enum';
import { User } from './user.entity';
import { Binding } from './binding.entity';

@Entity('instances')
export class Instance {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column()
  owner_user_id: number;

  @Column({
    type: 'enum',
    enum: InstanceStatus,
    default: InstanceStatus.STOPPED,
  })
  status: InstanceStatus;

  @Column({ unique: true, length: 100 })
  docker_container_name: string;

  @Column({ type: 'int' })
  port: number;

  @Column({ type: 'int', nullable: true })
  query_port: number;

  @Column({ type: 'int', nullable: true })
  rcon_port: number;

  @Column({ length: 100, default: 'gm_construct' })
  map: string;

  @Column({ length: 100, default: 'sandbox' })
  gamemode: string;

  @Column({ type: 'int', default: 16 })
  max_players: number;

  @Column({ default: false })
  auto_restart_on_code_change: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // 关联关系
  @ManyToOne(() => User, (user) => user.instances)
  @JoinColumn({ name: 'owner_user_id' })
  owner: User;

  @OneToMany(() => Binding, (binding) => binding.instance)
  bindings: Binding[];
}
