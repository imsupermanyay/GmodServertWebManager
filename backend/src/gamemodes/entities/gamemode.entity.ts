import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('gamemodes')
export class Gamemode {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, charset: 'utf8mb4', collation: 'utf8mb4_unicode_ci' })
  name: string;

  @Column({ charset: 'utf8mb4', collation: 'utf8mb4_unicode_ci' })
  onlineDir: string;

  @Column({ type: 'text', charset: 'utf8mb4', collation: 'utf8mb4_unicode_ci' })
  onlineRepoUrl: string;

  @Column({ charset: 'utf8mb4', collation: 'utf8mb4_unicode_ci' })
  devDir: string;

  @Column({ type: 'text', charset: 'utf8mb4', collation: 'utf8mb4_unicode_ci' })
  devRepoUrl: string;

  @Column({ charset: 'utf8mb4', collation: 'utf8mb4_unicode_ci' })
  coreDir: string;

  @Column({ charset: 'utf8mb4', collation: 'utf8mb4_unicode_ci' })
  buildDir: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
