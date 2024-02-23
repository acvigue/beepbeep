import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class PooledPhone {
  @PrimaryGeneratedColumn({ type: "int" })
  id: number = 0;

  @Column({ length: 100, unique: true, type: "varchar" })
  phone_number: string = "";

  @Column({ type: "int" })
  internal_id: number = 0;
}
