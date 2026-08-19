import type {
  Connection,
  Extension,
  Hocuspocus,
  onAuthenticatePayload,
  onConfigurePayload,
  onDestroyPayload,
} from "@hocuspocus/server";
import { uniq } from "es-toolkit";
import { AuthorizationChanged } from "@shared/collaboration/CloseEvents";
import { toError } from "@shared/utils/error";
import Logger from "@server/logging/Logger";
import { trace } from "@server/logging/tracing";
import Document from "@server/models/Document";
import GroupUser from "@server/models/GroupUser";
import type User from "@server/models/User";
import { can } from "@server/policies";
import RedisAdapter from "@server/storage/redis";
import { getUserForJWT } from "@server/utils/jwt";
import { AuthenticationError, InternalError } from "../errors";

/**
 * Redis channel that carries access changes to collaboration servers.
 */
const CHANNEL = "collaboration:authorization";

/**
 * Describes which connections are affected by an access change. A connection is
 * closed only when it matches every property provided, so an empty scope
 * matches all of them.
 */
export interface AuthorizationScope {
  /** Restrict to connections belonging to one of these users. */
  userIds?: string[];
  /** Restrict to connections belonging to members of this group. */
  groupId?: string;
  /** Restrict to connections for documents in this collection. */
  collectionId?: string;
  /** Restrict to connections for these documents. */
  documentIds?: string[];
}

/**
 * Authorizes connections to a document when they are established, and closes
 * them again whenever the access a user was granted may have changed. Clients
 * reconnect on their own, so authorization is only ever decided in one place.
 */
@trace()
export default class AuthenticationExtension implements Extension {
  /**
   * Publish an access change so that every collaboration server closes the
   * connections it holds within the given scope. Access itself is not
   * evaluated here, the scope only has to cover the connections that may be
   * affected.
   *
   * @param scope The connections that may be affected by the change.
   * @returns A promise that resolves once the change has been published.
   * @throws {Error} If the scope is empty, which would match every connection.
   */
  static async invalidate(scope: AuthorizationScope): Promise<void> {
    // An absent property matches all connections, so a scope in which every
    // property is absent would disconnect the entire cluster.
    if (!Object.values(scope).some((value) => value !== undefined)) {
      throw InternalError("An authorization scope must not be empty");
    }

    await RedisAdapter.collaborationClient.publish(
      CHANNEL,
      JSON.stringify(scope)
    );

    Logger.debug("multiplayer", "Published access change", scope);
  }

  async onAuthenticate({
    connection,
    token,
    documentName,
  }: onAuthenticatePayload) {
    // allows for different entity types to use this multiplayer provider later
    const [, documentId] = documentName.split(".");

    if (!token) {
      throw AuthenticationError("Authentication required");
    }

    const { user } = await getUserForJWT(token, ["session", "collaboration"]);
    const document = await Document.findByPk(documentId, {
      userId: user.id,
    });

    if (!can(user, "read", document)) {
      throw AuthenticationError("Authorization required");
    }

    // set document to read only for the current user, thus changes will not be
    // accepted and synced to other clients
    if (!can(user, "update", document)) {
      connection.readOnly = true;
    }

    return {
      user,
    };
  }

  async onConfigure({ instance }: onConfigurePayload) {
    this.instance = instance;

    if (this.subscribed) {
      return;
    }
    this.subscribed = true;

    try {
      const subscriber = RedisAdapter.collaborationSubscriber;
      await subscriber.subscribe(CHANNEL);
      subscriber.on("message", this.handleMessage);

      Logger.debug("multiplayer", `Subscribed to ${CHANNEL}`);
    } catch (error) {
      Logger.error("Failed to subscribe to access changes", toError(error));
      this.subscribed = false;
    }
  }

  async onDestroy(_data: onDestroyPayload) {
    if (this.subscribed) {
      const subscriber = RedisAdapter.collaborationSubscriber;
      subscriber.off("message", this.handleMessage);
      await subscriber.unsubscribe(CHANNEL);
      this.subscribed = false;
    }

    this.instance = undefined;
  }

  /**
   * Close every locally held connection within the scope of an access change.
   * A client that has kept its access reconnects with only a brief
   * interruption, one that has not is refused by `onAuthenticate`.
   *
   * @param scope The connections that may be affected by the change.
   * @returns A promise that resolves once the connections have been closed.
   */
  async disconnect(scope: AuthorizationScope) {
    if (!this.instance) {
      return;
    }

    let affected: {
      documentId: string;
      userId: string;
      connection: Connection;
    }[] = [];

    for (const [documentName, document] of this.instance.documents) {
      const [, documentId] = documentName.split(".");

      if (scope.documentIds && !scope.documentIds.includes(documentId)) {
        continue;
      }

      for (const connection of document.getConnections()) {
        const context: { user?: User } = connection.context;
        const userId = context.user?.id;

        if (!userId || (scope.userIds && !scope.userIds.includes(userId))) {
          continue;
        }

        affected.push({ documentId, userId, connection });
      }
    }

    if (scope.groupId && affected.length) {
      const groupUsers = await GroupUser.findAll({
        attributes: ["userId"],
        where: {
          groupId: scope.groupId,
          userId: uniq(affected.map((item) => item.userId)),
        },
      });
      const userIds = new Set(groupUsers.map((groupUser) => groupUser.userId));
      affected = affected.filter((item) => userIds.has(item.userId));
    }

    if (scope.collectionId && affected.length) {
      const documents = await Document.unscoped().findAll({
        attributes: ["id"],
        where: {
          id: uniq(affected.map((item) => item.documentId)),
          collectionId: scope.collectionId,
        },
        paranoid: false,
      });
      const documentIds = new Set(documents.map((document) => document.id));
      affected = affected.filter((item) => documentIds.has(item.documentId));
    }

    if (!affected.length) {
      return;
    }

    // Each closed connection is logged again by LoggerExtension, so record the
    // reason once rather than per connection.
    Logger.info(
      "multiplayer",
      `Closing ${affected.length} connections to authorize them again`,
      scope
    );

    for (const { connection } of affected) {
      connection.close(AuthorizationChanged);
    }
  }

  private instance?: Hocuspocus;

  private subscribed = false;

  private handleMessage = async (channel: string, message: string) => {
    if (channel !== CHANNEL) {
      return;
    }

    try {
      const scope: AuthorizationScope = JSON.parse(message);
      await this.disconnect(scope);
    } catch (error) {
      Logger.error("Failed to handle access change", toError(error));
    }
  };
}
