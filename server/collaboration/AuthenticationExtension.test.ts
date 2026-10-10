import type {
  Hocuspocus,
  onAuthenticatePayload,
  onConfigurePayload,
  onDestroyPayload,
} from "@hocuspocus/server";
import { addHours, subSeconds } from "date-fns";
import { Minute } from "@shared/utils/time";
import { AuthorizationChanged } from "@shared/collaboration/CloseEvents";
import { CollectionPermission } from "@shared/types";
import { sleep } from "@shared/utils/timers";
import { UserMembership } from "@server/models";
import type User from "@server/models/User";
import RedisAdapter from "@server/storage/redis";
import {
  buildAdmin,
  buildCollection,
  buildDocument,
  buildGroup,
  buildGroupUser,
  buildTeam,
  buildUser,
} from "@server/test/factories";
import { APIUpdateExtension } from "./APIUpdateExtension";
import AuthenticationExtension from "./AuthenticationExtension";

const buildConnection = (user: User, expiresAt?: Date) => ({
  context: { user, expiresAt },
  readOnly: false,
  close: vi.fn(),
});

type Connections = Record<string, ReturnType<typeof buildConnection>[]>;

describe("AuthenticationExtension", () => {
  let extension: AuthenticationExtension;

  const configure = (connections: Connections) => {
    const instance = {
      documents: new Map(
        Object.entries(connections).map(([documentId, forDocument]) => [
          `document.${documentId}`,
          { getConnections: () => forDocument },
        ])
      ),
    } as unknown as Hocuspocus;

    return extension.onConfigure({ instance } as onConfigurePayload);
  };

  /** Build a private collection that a member has been given access to. */
  const buildPrivateCollection = async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      teamId: team.id,
      userId: admin.id,
      permission: null,
    });
    const document = await buildDocument({
      teamId: team.id,
      userId: admin.id,
      collectionId: collection.id,
    });
    const membership = await UserMembership.create({
      collectionId: collection.id,
      userId: user.id,
      createdById: admin.id,
      permission: CollectionPermission.ReadWrite,
    });

    return { admin, collection, document, membership, team, user };
  };

  beforeEach(() => {
    extension = new AuthenticationExtension();
  });

  afterEach(() => extension.onDestroy({} as onDestroyPayload));

  it("should disconnect when an invalidation is published", async () => {
    const { document, user } = await buildPrivateCollection();
    const connection = buildConnection(user);
    await configure({ [document.id]: [connection] });

    await AuthenticationExtension.invalidate({ userIds: [user.id] });
    await sleep(100);

    expect(connection.close).toHaveBeenCalledWith(AuthorizationChanged);
  });

  it("should ignore messages for other collaboration channels", async () => {
    const { document, user } = await buildPrivateCollection();
    const apiUpdates = new APIUpdateExtension();
    await apiUpdates.onConfigure({} as onConfigurePayload);

    const connection = buildConnection(user);
    await configure({ [document.id]: [connection] });

    // Both extensions share a single subscriber, so a message for one must not
    // be handled by the other.
    await RedisAdapter.collaborationClient.publish(
      `collaboration:api-update:${document.id}`,
      JSON.stringify({ actorId: user.id })
    );
    await sleep(100);

    expect(connection.close).not.toHaveBeenCalled();

    await AuthenticationExtension.invalidate({ userIds: [user.id] });
    await sleep(100);

    expect(connection.close).toHaveBeenCalledWith(AuthorizationChanged);
    await apiUpdates.onDestroy({} as onDestroyPayload);
  });

  it("should disconnect connections for documents in the collection", async () => {
    const { collection, document, user } = await buildPrivateCollection();
    const connection = buildConnection(user);
    await configure({ [document.id]: [connection] });

    await extension.disconnect({
      userIds: [user.id],
      collectionId: collection.id,
    });

    expect(connection.close).toHaveBeenCalledWith(AuthorizationChanged);
  });

  it("should disconnect connections for members of the group", async () => {
    const { document, team, user } = await buildPrivateCollection();
    const group = await buildGroup({ teamId: team.id });
    await buildGroupUser({
      teamId: team.id,
      groupId: group.id,
      userId: user.id,
    });
    const connection = buildConnection(user);
    await configure({ [document.id]: [connection] });

    await extension.disconnect({ groupId: group.id });

    expect(connection.close).toHaveBeenCalledWith(AuthorizationChanged);
  });

  it("should not disconnect connections belonging to another user", async () => {
    const { collection, document, team, user } = await buildPrivateCollection();
    const other = await buildUser({ teamId: team.id });
    const connection = buildConnection(user);
    await configure({ [document.id]: [connection] });

    await extension.disconnect({
      userIds: [other.id],
      collectionId: collection.id,
    });

    expect(connection.close).not.toHaveBeenCalled();
  });

  it("should not disconnect connections for documents in another collection", async () => {
    const { document, team, user } = await buildPrivateCollection();
    const other = await buildCollection({ teamId: team.id });
    const connection = buildConnection(user);
    await configure({ [document.id]: [connection] });

    await extension.disconnect({ collectionId: other.id });

    expect(connection.close).not.toHaveBeenCalled();
  });

  it("should not disconnect connections for users outside the group", async () => {
    const { document, team, user } = await buildPrivateCollection();
    const group = await buildGroup({ teamId: team.id });
    const connection = buildConnection(user);
    await configure({ [document.id]: [connection] });

    await extension.disconnect({ groupId: group.id });

    expect(connection.close).not.toHaveBeenCalled();
  });

  it("should refuse to publish an empty scope", async () => {
    await expect(AuthenticationExtension.invalidate({})).rejects.toThrow(
      "must not be empty"
    );
    await expect(
      AuthenticationExtension.invalidate({ userIds: undefined })
    ).rejects.toThrow("must not be empty");
  });

  it("should not disconnect connections for other documents", async () => {
    const { document, user } = await buildPrivateCollection();
    const connection = buildConnection(user);
    await configure({ [document.id]: [connection] });

    await extension.disconnect({ documentIds: ["other-document-id"] });

    expect(connection.close).not.toHaveBeenCalled();
  });

  it("should keep the token expiry in the connection context", async () => {
    const { document, user } = await buildPrivateCollection();

    const context = await extension.onAuthenticate({
      token: user.getCollaborationToken(),
      documentName: `document.${document.id}`,
      connection: { readOnly: false },
    } as onAuthenticatePayload);

    const expiresAt = context.expiresAt?.getTime() ?? 0;
    expect(expiresAt).toBeGreaterThan(addHours(new Date(), 23).getTime());
    expect(expiresAt).toBeLessThanOrEqual(addHours(new Date(), 24).getTime());
  });

  it("should disconnect connections with an expired token", async () => {
    const { document, user } = await buildPrivateCollection();
    const connection = buildConnection(user, subSeconds(new Date(), 1));
    await configure({ [document.id]: [connection] });

    extension.disconnectExpired();

    expect(connection.close).toHaveBeenCalledWith(AuthorizationChanged);
  });

  it("should not disconnect connections before the token expires", async () => {
    const { document, user } = await buildPrivateCollection();
    const valid = buildConnection(user, addHours(new Date(), 1));
    const never = buildConnection(user);
    await configure({ [document.id]: [valid, never] });

    extension.disconnectExpired();

    expect(valid.close).not.toHaveBeenCalled();
    expect(never.close).not.toHaveBeenCalled();
  });

  it("should check for expired tokens on an interval", async () => {
    const { document, user } = await buildPrivateCollection();
    const connection = buildConnection(user, subSeconds(new Date(), 1));
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });

    try {
      await configure({ [document.id]: [connection] });
      expect(connection.close).not.toHaveBeenCalled();

      vi.advanceTimersByTime(Minute.ms);
      expect(connection.close).toHaveBeenCalledWith(AuthorizationChanged);

      await extension.onDestroy({} as onDestroyPayload);
      connection.close.mockClear();
      vi.advanceTimersByTime(Minute.ms);
      expect(connection.close).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
