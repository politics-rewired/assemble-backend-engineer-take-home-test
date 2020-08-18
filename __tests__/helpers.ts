import { reverse } from "lodash";
import { Pool, PoolClient } from "pg";

export type WithClientCallback<T> = (client: PoolClient) => Promise<T>;

export const withClient = async <T>(
  pool: Pool,
  callback: WithClientCallback<T>
) => {
  const client = await pool.connect();
  try {
    return await callback(client);
  } finally {
    client.release();
  }
};

interface PgMiddleware {
  after: string;
  before: string;
}

export const withPgMiddlewares = async <T>(
  pool: Pool,
  middlewares: PgMiddleware[],
  callback: (client: PoolClient) => Promise<T>
) =>
  withClient(pool, async (client) => {
    for (const middleware of middlewares) {
      await client.query(middleware.before);
    }

    const result = await callback(client);

    for (const middleware of reverse(middlewares)) {
      await client.query(middleware.after);
    }

    return result;
  });

/**
 * This cannot be used simultaneous with other transactions
 */
export const autoRollbackMiddleware: PgMiddleware = {
  after: "rollback",
  before: "begin",
};

export const disableTriggersMiddleware: PgMiddleware = {
  after: `set session_replication_role to 'replica'`,
  before: `set session_replication_role to default`,
};
