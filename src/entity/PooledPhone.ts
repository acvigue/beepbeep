import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class PooledPhone {
  @PrimaryGeneratedColumn({ type: "int" })
  id!: number;

  @Column({ length: 100, unique: true, type: "varchar" })
  phone_number!: string;

  @Column({ type: "int" })
  internal_id!: number;

  @Column({ type: "int" })
  used: number = 0;
}
