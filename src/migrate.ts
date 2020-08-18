import { Pool, PoolClient } from "pg";
import { readdirSync, readFileSync } from "fs";

type PoolOrPoolClient = Pool | PoolClient;

export const up = async (client: PoolOrPoolClient) => {
  const files = readdirSync("./sql");

  for (const file of files) {
    const text = readFileSync(`./sql/${file}`).toString();
    await client.query(text);
  }
};

export const down = async (client: PoolOrPoolClient) => {
  await client.query("drop schema public cascade;");
  await client.query("create schema public;");
};

const pool = new Pool({});
export const reset = async () => {
  await down(pool);
  await up(pool);
};
