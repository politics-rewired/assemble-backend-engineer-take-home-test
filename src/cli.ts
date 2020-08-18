import { Command } from "commander";
import { up, down, reset } from "./migrate";
import { Pool } from "pg";

const program = new Command();

const pool = new Pool({});

const migrateUp = new Command("migrate:up").action(async () => {
  await up(pool);
  console.log("Migrations run");
  process.exit();
});

const migrateDown = new Command("migrate:down").action(async () => {
  await down(pool);
  console.log("Schema dropped");
  process.exit();
});

const migrateReset = new Command("migrate:reset").action(async () => {
  await reset();
  console.log("Migrations rest");
  process.exit();
});

program.addCommand(migrateUp);
program.addCommand(migrateDown);
program.addCommand(migrateReset);

const main = async () => {
  const program = new Command();
  await program.parseAsync(process.argv);
};

main();
