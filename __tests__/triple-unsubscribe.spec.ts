import { withPgMiddlewares, autoRollbackMiddleware } from "./helpers";
import { Pool, PoolClient } from "pg";
import faker from "faker";
import {
  setupFourProfiles,
  sendMessage,
  insertUnsubscribedDeliveryReport,
  insertSpamDeliveryReport,
} from "./setup";

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || "postgres://postgres@localhost:5432/rewired_test",
});

describe("triple opt out", () => {
  test("should successfully send a first message", async () => {
    const messageId = await withPgMiddlewares(
      pool,
      [autoRollbackMiddleware],
      async (client: PoolClient) => {
        const toNumber = faker.phone.phoneNumber();
        const body = faker.hacker.phrase();

        const profiles = await setupFourProfiles(client);
        const mid = await sendMessage(client, profiles[0], toNumber, body);
        return mid;
      }
    );

    expect(messageId).not.toBeNull();
  });

  test("should successfully send a second message after one unsubscribes", async () => {
    const messageId = await withPgMiddlewares(
      pool,
      [autoRollbackMiddleware],
      async (client: PoolClient) => {
        const toNumber = faker.phone.phoneNumber();
        const body = faker.hacker.phrase();

        const profiles = await setupFourProfiles(client);
        const first = await sendMessage(client, profiles[0], toNumber, body);

        await insertUnsubscribedDeliveryReport(client, first);

        const second = await sendMessage(client, profiles[1], toNumber, body);

        return second;
      }
    );

    expect(messageId).not.toBeNull();
  });

  test("should successfully send a third message after two unsubscribes", async () => {
    const messageId = await withPgMiddlewares(
      pool,
      [autoRollbackMiddleware],
      async (client: PoolClient) => {
        const toNumber = faker.phone.phoneNumber();
        const body = faker.hacker.phrase();

        const profiles = await setupFourProfiles(client);

        const first = await sendMessage(client, profiles[0], toNumber, body);
        await insertUnsubscribedDeliveryReport(client, first);

        const second = await sendMessage(client, profiles[1], toNumber, body);
        await insertUnsubscribedDeliveryReport(client, second);

        const third = await sendMessage(client, profiles[2], toNumber, body);

        return third;
      }
    );

    expect(messageId).not.toBeNull();
  });

  test("should fail to send a fourth message after three unsubscribes", async () => {
    const { messageId, errorMessage } = await withPgMiddlewares(
      pool,
      [autoRollbackMiddleware],
      async (client: PoolClient) => {
        const toNumber = faker.phone.phoneNumber();
        const body = faker.hacker.phrase();

        const profiles = await setupFourProfiles(client);

        const first = await sendMessage(client, profiles[0], toNumber, body);
        await insertUnsubscribedDeliveryReport(client, first);

        const second = await sendMessage(client, profiles[1], toNumber, body);
        await insertUnsubscribedDeliveryReport(client, second);

        const third = await sendMessage(client, profiles[2], toNumber, body);
        await insertUnsubscribedDeliveryReport(client, third);

        let fourth, errorMessage;

        try {
          fourth = await sendMessage(
            client,
            profiles[3],
            toNumber,
            "fake pass body"
          );
        } catch (ex) {
          errorMessage = ex.message;
        }

        return { messageId: fourth, errorMessage };
      }
    );

    expect(errorMessage).toBe(
      "Cannot send message - frequently unsubscribed recipient"
    );

    expect(messageId).toBeUndefined();
  });

  test("should succeed to in sending a fourth message after two unsubscribes and one spam report", async () => {
    const { messageId, errorMessage } = await withPgMiddlewares(
      pool,
      [autoRollbackMiddleware],
      async (client: PoolClient) => {
        const toNumber = faker.phone.phoneNumber();
        const body = faker.hacker.phrase();

        const profiles = await setupFourProfiles(client);

        const first = await sendMessage(client, profiles[0], toNumber, body);
        await insertUnsubscribedDeliveryReport(client, first);

        const second = await sendMessage(client, profiles[1], toNumber, body);
        await insertUnsubscribedDeliveryReport(client, second);

        const third = await sendMessage(client, profiles[2], toNumber, body);
        await insertSpamDeliveryReport(client, third);

        let fourth, errorMessage;

        try {
          fourth = await sendMessage(client, profiles[3], toNumber, body);
        } catch (ex) {
          errorMessage = ex.message;
        }

        return { messageId: fourth, errorMessage };
      }
    );

    expect(errorMessage).toBeUndefined();
    expect(messageId).not.toBeUndefined();
  });

  test("should successfully send a third message after two distinct and one duplicate unsubscribes", async () => {
    const { messageId, errorMessage } = await withPgMiddlewares(
      pool,
      [autoRollbackMiddleware],
      async (client: PoolClient) => {
        const toNumber = faker.phone.phoneNumber();
        const body = faker.hacker.phrase();

        const profiles = await setupFourProfiles(client);

        const first = await sendMessage(client, profiles[0], toNumber, body);
        await insertUnsubscribedDeliveryReport(client, first);

        const second = await sendMessage(client, profiles[1], toNumber, body);
        await insertUnsubscribedDeliveryReport(client, second);

        const third = await sendMessage(client, profiles[1], toNumber, body);
        await insertUnsubscribedDeliveryReport(client, third);

        let fourth, errorMessage;

        try {
          fourth = await sendMessage(client, profiles[3], toNumber, body);
        } catch (ex) {
          errorMessage = ex.message;
        }

        return { messageId: fourth, errorMessage };
      }
    );

    expect(errorMessage).toBeUndefined();
    expect(messageId).not.toBeUndefined();
  });
});
