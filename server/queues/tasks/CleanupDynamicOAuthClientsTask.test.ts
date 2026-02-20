import { subDays, subHours } from "date-fns";
import { OAuthClient } from "@server/models";
import { buildOAuthClient, buildUser } from "@server/test/factories";
import CleanupDynamicOAuthClientsTask from "./CleanupDynamicOAuthClientsTask";

const clientExists = async (client: OAuthClient) => {
  const found = await OAuthClient.unscoped().findByPk(client.id);
  return !!found;
};

describe("CleanupDynamicOAuthClientsTask", () => {
  it("should delete never-used dynamic clients older than 48 hours", async () => {
    const client = await buildOAuthClient({
      createdById: null,
      createdAt: subDays(new Date(), 3),
    });

    const task = new CleanupDynamicOAuthClientsTask();
    await task.perform({
      limit: 100,
      partition: { partitionIndex: 0, partitionCount: 1 },
    });

    expect(await clientExists(client)).toBe(false);
  });

  it("should not delete never-used dynamic clients younger than 48 hours", async () => {
    const client = await buildOAuthClient({
      createdById: null,
      createdAt: subHours(new Date(), 12),
    });

    const task = new CleanupDynamicOAuthClientsTask();
    await task.perform({
      limit: 100,
      partition: { partitionIndex: 0, partitionCount: 1 },
    });

    expect(await clientExists(client)).toBe(true);
  });

  it("should delete used dynamic clients inactive for more than 30 days", async () => {
    const client = await buildOAuthClient({
      createdById: null,
      createdAt: subDays(new Date(), 60),
      lastActiveAt: subDays(new Date(), 45),
    });

    const task = new CleanupDynamicOAuthClientsTask();
    await task.perform({
      limit: 100,
      partition: { partitionIndex: 0, partitionCount: 1 },
    });

    expect(await clientExists(client)).toBe(false);
  });

  it("should not delete used dynamic clients active within the last 30 days", async () => {
    const client = await buildOAuthClient({
      createdById: null,
      createdAt: subDays(new Date(), 60),
      lastActiveAt: subDays(new Date(), 5),
    });

    const task = new CleanupDynamicOAuthClientsTask();
    await task.perform({
      limit: 100,
      partition: { partitionIndex: 0, partitionCount: 1 },
    });

    expect(await clientExists(client)).toBe(true);
  });

  it("should not delete non-dynamic clients regardless of age or activity", async () => {
    const user = await buildUser();
    const client = await buildOAuthClient({
      teamId: user.teamId,
      createdAt: subDays(new Date(), 90),
    });

    const task = new CleanupDynamicOAuthClientsTask();
    await task.perform({
      limit: 100,
      partition: { partitionIndex: 0, partitionCount: 1 },
    });

    expect(await clientExists(client)).toBe(true);
  });

  it("should not delete recently active dynamic client even if created long ago", async () => {
    const client = await buildOAuthClient({
      createdById: null,
      createdAt: subDays(new Date(), 90),
      lastActiveAt: subDays(new Date(), 2),
    });

    const task = new CleanupDynamicOAuthClientsTask();
    await task.perform({
      limit: 100,
      partition: { partitionIndex: 0, partitionCount: 1 },
    });

    expect(await clientExists(client)).toBe(true);
  });
});
