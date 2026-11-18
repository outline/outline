import { randomUUID } from "node:crypto";
import { subDays, subHours } from "date-fns";
import { Scope } from "@shared/types";
import { OAuthClient } from "@server/models";
import FileStorage from "@server/storage/files";
import {
  buildMetadataDocumentOAuthClient,
  buildOAuthAuthentication,
  buildOAuthClient,
  buildUser,
} from "@server/test/factories";
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

  it("should not delete a metadata document client with active tokens", async () => {
    const user = await buildUser();
    const client = await buildMetadataDocumentOAuthClient({
      createdAt: subDays(new Date(), 90),
      lastActiveAt: subDays(new Date(), 45),
    });
    await buildOAuthAuthentication({
      user,
      oauthClientId: client.id,
      scope: [Scope.Read],
    });

    const task = new CleanupDynamicOAuthClientsTask();
    await task.perform({
      limit: 100,
      partition: { partitionIndex: 0, partitionCount: 1 },
    });

    expect(await clientExists(client)).toBe(true);
  });

  it("should delete a metadata document client whose tokens have expired", async () => {
    const user = await buildUser();
    const client = await buildMetadataDocumentOAuthClient({
      createdAt: subDays(new Date(), 90),
    });
    const authentication = await buildOAuthAuthentication({
      user,
      oauthClientId: client.id,
      scope: [Scope.Read],
    });
    await authentication.update({
      accessTokenExpiresAt: subDays(new Date(), 2),
      refreshTokenExpiresAt: subDays(new Date(), 1),
    });

    const task = new CleanupDynamicOAuthClientsTask();
    await task.perform({
      limit: 100,
      partition: { partitionIndex: 0, partitionCount: 1 },
    });

    expect(await clientExists(client)).toBe(false);
  });

  it("should delete a metadata document client without tokens", async () => {
    const client = await buildMetadataDocumentOAuthClient({
      createdAt: subDays(new Date(), 3),
    });

    const task = new CleanupDynamicOAuthClientsTask();
    await task.perform({
      limit: 100,
      partition: { partitionIndex: 0, partitionCount: 1 },
    });

    expect(await clientExists(client)).toBe(false);
  });

  it("should not delete a new metadata document client without tokens", async () => {
    const client = await buildMetadataDocumentOAuthClient({
      createdAt: subHours(new Date(), 1),
    });

    const task = new CleanupDynamicOAuthClientsTask();
    await task.perform({
      limit: 100,
      partition: { partitionIndex: 0, partitionCount: 1 },
    });

    expect(await clientExists(client)).toBe(true);
  });

  it("should delete the logo of a deleted client", async () => {
    const deleteFile = vi.spyOn(FileStorage, "deleteFile");
    const id = randomUUID();
    const key = OAuthClient.logoKey(id, "b".repeat(64), "png");
    await buildMetadataDocumentOAuthClient({
      id,
      avatarUrl: FileStorage.getUrlForKey(key),
      createdAt: subDays(new Date(), 3),
    });

    const task = new CleanupDynamicOAuthClientsTask();
    await task.perform({
      limit: 100,
      partition: { partitionIndex: 0, partitionCount: 1 },
    });

    expect(deleteFile).toHaveBeenCalledWith(key);
    deleteFile.mockRestore();
  });

  it("should only run delete hooks for clients within the limit", async () => {
    const deleteFile = vi.spyOn(FileStorage, "deleteFile");
    const clients = await Promise.all(
      [randomUUID(), randomUUID()].map((id) =>
        buildOAuthClient({
          id,
          createdById: null,
          avatarUrl: FileStorage.getUrlForKey(
            OAuthClient.logoKey(id, "c".repeat(64), "png")
          ),
          createdAt: subDays(new Date(), 3),
        })
      )
    );

    const task = new CleanupDynamicOAuthClientsTask();
    await task.perform({
      limit: 1,
      partition: { partitionIndex: 0, partitionCount: 1 },
    });

    // Other tests can leave clients that match, so count only these.
    const remaining = await Promise.all(clients.map(clientExists));
    const deleted = remaining.filter((exists) => !exists).length;
    expect(deleted).toBeLessThanOrEqual(1);
    expect(deleteFile).toHaveBeenCalledTimes(deleted);
    deleteFile.mockRestore();
  });
});
