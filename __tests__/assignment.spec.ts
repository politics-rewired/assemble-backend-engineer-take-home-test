import { withPgMiddlewares, autoRollbackMiddleware } from "./helpers";
import { Pool, PoolClient } from "pg";
import { reset } from "../src/migrate";
import faker from "faker";

type PoolOrPoolClient = Pool | PoolClient;

enum DeliveryReportEvents {
  Delivered = "delivered",
  Failed = "failed",
}

enum ErrorCodes {
  Spam = 30007,
  Unsubscribed = 21610,
}

const setupProfile = async (client: PoolOrPoolClient): Promise<string> => {
  const {
    rows: [profile],
  } = await client.query(
    "insert into profiles (name) values ($1) returning id",
    [faker.company.companyName()]
  );
  return profile.id;
};

const setupFourProfiles = async (client: PoolOrPoolClient) => {
  const profiles = await Promise.all([
    setupProfile(client),
    setupProfile(client),
    setupProfile(client),
    setupProfile(client),
  ]);
  return profiles;
};

const sendMessage = async (
  client: PoolOrPoolClient,
  profileId: string,
  toNumber: string,
  body: string
) => {
  const {
    rows: [message],
  } = await client.query(
    "insert into outbound_messages (profile_id, to_number, body) values ($1, $2, $3) returning id",
    [profileId, toNumber, body]
  );

  return message.id;
};

const insertSuccessDeliveryReport = async (
  client: PoolOrPoolClient,
  messageId: string
) => {
  await client.query(
    "insert into delivery_reports (message_id, event_type) values ($1, $2)",
    [messageId, DeliveryReportEvents.Delivered]
  );
};

const insertSpamDeliveryReport = async (
  client: PoolOrPoolClient,
  messageId: string
) => {
  await client.query(
    "insert into delivery_reports (message_id, event_type, error_code) values ($1, $2, $3)",
    [messageId, DeliveryReportEvents.Failed, ErrorCodes.Spam]
  );
};

const insertUnsubscribedDeliveryReport = async (
  client: PoolOrPoolClient,
  messageId: string
) => {
  await client.query(
    "insert into delivery_reports (message_id, event_type, error_code) values ($1, $2, $3)",
    [messageId, DeliveryReportEvents.Failed, ErrorCodes.Unsubscribed]
  );
};

const pool = new Pool({});

describe("triple opt out", () => {
  beforeAll(async () => {
    await reset();
  });

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
