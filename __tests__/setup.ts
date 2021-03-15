import { Pool, PoolClient } from "pg";
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

export const setupProfile = async (
  client: PoolOrPoolClient
): Promise<string> => {
  const {
    rows: [profile],
  } = await client.query(
    "insert into profiles (name) values ($1) returning id",
    [faker.company.companyName()]
  );
  return profile.id;
};

export const setupFourProfiles = async (client: PoolOrPoolClient) => {
  const profiles = await Promise.all([
    setupProfile(client),
    setupProfile(client),
    setupProfile(client),
    setupProfile(client),
  ]);
  return profiles;
};

export const sendMessage = async (
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

export const insertSuccessDeliveryReport = async (
  client: PoolOrPoolClient,
  messageId: string
) => {
  await client.query(
    "insert into delivery_reports (message_id, event_type) values ($1, $2)",
    [messageId, DeliveryReportEvents.Delivered]
  );
};

export const insertSpamDeliveryReport = async (
  client: PoolOrPoolClient,
  messageId: string
) => {
  await client.query(
    "insert into delivery_reports (message_id, event_type, error_code) values ($1, $2, $3)",
    [messageId, DeliveryReportEvents.Failed, ErrorCodes.Spam]
  );
};

export const insertUnsubscribedDeliveryReport = async (
  client: PoolOrPoolClient,
  messageId: string
) => {
  await client.query(
    "insert into delivery_reports (message_id, event_type, error_code) values ($1, $2, $3)",
    [messageId, DeliveryReportEvents.Failed, ErrorCodes.Unsubscribed]
  );
};
