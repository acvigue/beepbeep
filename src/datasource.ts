import "reflect-metadata";
import { DataSource } from "typeorm";
import { PooledPhone } from "./entity/PooledPhone";
import { resolve } from "path";
import { config } from "dotenv";

config();

export const AppDataSource = new DataSource({
  type: "sqlite",
  database: resolve(process.env.CONFIG_PATH ?? "", "database.db"),
  entities: [PooledPhone],
  synchronize: true,
  logging: true,
});
