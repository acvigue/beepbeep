import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class TVBestLogin {
  @PrimaryGeneratedColumn({ type: "int" })
  id!: number;

  @Column({ type: "int" })
  tuner_id!: number;

  @Column({ length: 100, unique: true, type: "varchar" })
  username!: string;

  @Column({ type: "varchar", length: 100 })
  password!: string;

  @Column({ type: "datetime" })
  expires_at!: Date;
}
