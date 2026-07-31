import { compact, concat, uniq, uniqBy } from "es-toolkit/compat";
import type { Server } from "socket.io";
import {
  Comment,
  Document,
  Collection,
  FileOperation,
  Group,
  GroupMembership,
  GroupUser,
  Pin,
  Star,
  Team,
  Subscription,
  Notification,
  UserMembership,
  User,
  Import,
  Template,
} from "@server/models";
import { cannot } from "@server/policies";
import {
  presentComment,
  presentCollection,
  presentDocument,
  presentFileOperation,
  presentGroup,
  presentPin,
  presentStar,
  presentSubscription,
  presentTeam,
  presentMembership,
  presentUser,
  presentGroupMembership,
  presentGroupUser,
  presentImport,
} from "@server/presenters";
import presentNotification from "@server/presenters/notification";
import type { Event } from "../../types";

export default class WebsocketsProcessor {
  public async perform(event: Event, socketio: Server) {
    switch (event.name) {
      case "templates.create":
      case "templates.update":
      case "templates.restore": {
        const template = await Template.findByPk(event.modelId, {
          paranoid: false,
        });
        if (!template) {
          return;
        }

        const channels = await this.getTemplateEventChannels(event, template);

        return socketio.to(channels).emit("entities", {
          event: event.name,
          invalidatedPolicies: [template.id],
          templateIds: [
            {
              id: template.id,
              updatedAt: template.updatedAt,
            },
          ],
        });
      }

      case "templates.delete": {
        return socketio.to(`team-${event.teamId}`).emit("entities", {
          event: event.name,
          modelId: event.modelId,
        });
      }

      case "documents.create":
      case "documents.publish":
      case "documents.restore": {
        const document = await Document.findByPk(event.documentId, {
          paranoid: false,
        });
        if (!document) {
          return;
        }
        if (
          event.name === "documents.create" &&
          event.data?.source === "import"
        ) {
          return;
        }

        const channels = await this.getDocumentEventChannels(event, document);

        let collectionIds: { id: string; updatedAt?: Date }[] = [];
        if (document.collectionId) {
          const collection = await Collection.findByPk(document.collectionId, {
            attributes: ["id", "updatedAt"],
          });
          if (collection) {
            collectionIds = [
              {
                id: collection.id,
                updatedAt: collection.updatedAt,
              },
            ];
          }
        }

        return socketio.to(channels).emit("entities", {
          event: event.name,
          invalidatedPolicies:
            event.name === "documents.create" ? [] : [document.id],
          documentIds: [
            {
              id: document.id,
              updatedAt: document.updatedAt,
            },
          ],
          collectionIds,
        });
      }

      case "documents.unpublish": {
        const document = await Document.findByPk(event.documentId, {
          paranoid: false,
        });

        if (!document) {
          return;
        }

        const documentToPresent = await presentDocument(undefined, document);

        const channels = await this.getDocumentEventChannels(event, document);

        // We need to add the collection channel to let the members update the doc structure.
        // In case draft is detached from a collection, fallback to previous attribute to get the right one.
        const collectionId =
          event.collectionId ?? event.changes?.previous.collectionId;

        channels.push(`collection-${collectionId}`);

        return socketio.to(channels).emit(event.name, {
          document: documentToPresent,
          collectionId,
        });
      }

      case "documents.unarchive": {
        const srcCollectionId =
          event.changes?.previous.collectionId ?? event.collectionId;

        const [document, srcCollection] = await Promise.all([
          Document.findByPk(event.documentId, { paranoid: false }),
          Collection.findByPk(srcCollectionId, {
            paranoid: false,
          }),
        ]);
        if (!document || !srcCollection) {
          return;
        }
        const documentChannels = await this.getDocumentEventChannels(
          event,
          document
        );
        const collectionChannels = this.getCollectionEventChannels(
          event,
          srcCollection
        );

        const channels = uniq(concat(documentChannels, collectionChannels));

        const destCollection = document.collectionId
          ? await Collection.findByPk(document.collectionId, {
              attributes: ["id", "updatedAt"],
            })
          : null;

        return socketio.to(channels).emit("entities", {
          event: event.name,
          invalidatedPolicies: [document.id],
          documentIds: [
            {
              id: document.id,
              updatedAt: document.updatedAt,
            },
          ],
          collectionIds: uniqBy(
            compact([
              destCollection
                ? {
                    id: destCollection.id,
                    updatedAt: destCollection.updatedAt,
                  }
                : undefined,
              {
                id: srcCollection.id,
                updatedAt: srcCollection.updatedAt,
              },
            ]),
            "id"
          ),
        });
      }

      case "documents.permanent_delete": {
        // The document is already gone, so the channels it was published to
        // cannot be resolved. The payload is an ID only, so it is broadcast to
        // the team to ensure everyone holding a copy discards it.
        return socketio.to(`team-${event.teamId}`).emit(event.name, {
          modelId: event.documentId,
        });
      }

      case "documents.archive":
      case "documents.delete":
      case "documents.update": {
        const document = await Document.findByPk(event.documentId, {
          paranoid: false,
        });
        if (!document) {
          return;
        }
        const data = await presentDocument(undefined, document);
        const channels = await this.getDocumentEventChannels(event, document);
        return socketio.to(channels).emit(event.name, data);
      }

      case "documents.move": {
        const documents = await Document.findAll({
          where: {
            id: event.data.documentIds,
          },
          paranoid: false,
        });
        // Documents are invalidated in both the source and destination
        // collections – members of the former may no longer have access to
        // them. This is distinct from the collection invalidation below, which
        // only refreshes the document structure.
        const documentChannels = uniq(
          concat(
            event.data.collectionIds.map((id) => `collection-${id}`),
            `collection-${event.collectionId}`
          )
        );

        documents.forEach((document) => {
          socketio.to(documentChannels).emit("entities", {
            event: event.name,
            invalidatedPolicies: [document.id],
            documentIds: [
              {
                id: document.id,
                updatedAt: document.updatedAt,
              },
            ],
          });
        });
        const moveCollections = await Collection.findAll({
          where: { id: event.data.collectionIds },
          attributes: ["id", "updatedAt"],
        });
        moveCollections.forEach((collection) => {
          socketio.to(`collection-${collection.id}`).emit("entities", {
            event: event.name,
            collectionIds: [
              {
                id: collection.id,
                updatedAt: collection.updatedAt,
              },
            ],
          });
        });
        return;
      }

      case "documents.add_user": {
        const [document, membership] = await Promise.all([
          Document.findByPk(event.documentId),
          UserMembership.findByPk(event.modelId),
        ]);
        if (!document || !membership) {
          return;
        }

        const channels = await this.getDocumentEventChannels(event, document);
        socketio.to(channels).emit(event.name, presentMembership(membership));
        return;
      }

      case "documents.remove_user": {
        const document = await Document.findByPk(event.documentId);
        if (!document) {
          return;
        }

        const channels = await this.getDocumentEventChannels(event, document);
        socketio.to([...channels, `user-${event.userId}`]).emit(event.name, {
          id: event.modelId,
          userId: event.userId,
          documentId: event.documentId,
        });
        return;
      }

      case "documents.add_group": {
        const [document, membership] = await Promise.all([
          Document.findByPk(event.documentId),
          GroupMembership.findByPk(event.data.membershipId),
        ]);
        if (!document || !membership) {
          return;
        }

        const channels = await this.getDocumentEventChannels(event, document);
        socketio
          .to(channels)
          .emit(event.name, presentGroupMembership(membership));
        return;
      }

      case "documents.remove_group": {
        const [document, group] = await Promise.all([
          Document.findByPk(event.documentId),
          Group.findByPk(event.modelId),
        ]);
        if (!document || !group) {
          return;
        }

        const channels = await this.getDocumentEventChannels(event, document);
        socketio.to([...channels, `group-${event.modelId}`]).emit(event.name, {
          id: event.data.membershipId,
          groupId: event.modelId,
          documentId: event.documentId,
        });
        return;
      }

      case "collections.create": {
        const collection = await Collection.findByPk(event.collectionId, {
          paranoid: false,
        });
        if (!collection) {
          return;
        }

        // guests are excluded as they cannot read team-visible collections
        // without an explicit membership.
        const rooms = collection.isPrivate
          ? [`user-${event.actorId}`]
          : [`user-${event.actorId}`, `team-${collection.teamId}.members`];

        socketio
          .to(rooms)
          .emit(event.name, await presentCollection(undefined, collection));

        return socketio.in(rooms).socketsJoin(`collection-${collection.id}`);
      }

      case "collections.update": {
        const collection = await Collection.findByPk(event.collectionId, {
          paranoid: false,
        });
        if (!collection) {
          return;
        }

        socketio
          .to(this.getCollectionEventChannels(event, collection))
          .emit(event.name, await presentCollection(undefined, collection));

        const { attributes, previous } = event.changes ?? {};

        // the collection became team-visible, all team members gain access.
        if (attributes?.permission && previous?.permission === null) {
          return socketio
            .in(`team-${collection.teamId}.members`)
            .socketsJoin(`collection-${collection.id}`);
        }

        // the collection became private, rebuild the channel from explicit
        // memberships only.
        if (attributes?.permission === null && previous?.permission) {
          const [memberships, groupMemberships] = await Promise.all([
            UserMembership.findAll({
              where: { collectionId: collection.id },
            }),
            GroupMembership.findAll({
              where: { collectionId: collection.id },
            }),
          ]);
          const rooms = [
            ...memberships.map((m) => `user-${m.userId}`),
            ...groupMemberships.map((m) => `group-${m.groupId}`),
          ];

          // Everyone in the channel without an explicit membership has lost
          // access to the documents within and must discard them.
          socketio
            .in(`collection-${collection.id}`)
            .except(rooms)
            .emit("collections.revoke_access", { modelId: collection.id });

          socketio
            .in(`collection-${collection.id}`)
            .socketsLeave(`collection-${collection.id}`);

          if (rooms.length) {
            socketio.in(rooms).socketsJoin(`collection-${collection.id}`);
          }
        }

        return;
      }

      case "collections.delete": {
        const collection = await Collection.findByPk(event.collectionId, {
          paranoid: false,
        });
        if (!collection) {
          return;
        }

        return socketio
          .to(this.getCollectionEventChannels(event, collection))
          .emit(event.name, {
            modelId: event.collectionId,
          });
      }

      case "collections.archive":
      case "collections.restore": {
        const collection = await Collection.findByPk(event.collectionId);
        if (!collection) {
          return;
        }

        const archivedAt =
          event.name === "collections.archive"
            ? event.changes?.attributes.archivedAt
            : event.changes?.previous.archivedAt;

        return socketio
          .to(this.getCollectionEventChannels(event, collection))
          .emit(event.name, {
            id: event.collectionId,
            archivedAt,
          });
      }

      case "collections.move": {
        return socketio
          .to(`collection-${event.collectionId}`)
          .emit("collections.update_index", {
            collectionId: event.collectionId,
            index: event.changes?.attributes.index,
          });
      }

      case "collections.add_user": {
        const membership = await UserMembership.findByPk(event.modelId);
        if (!membership) {
          return;
        }
        // the user being added isn't yet in the websocket channel for the collection
        // so they need to be notified separately
        socketio
          .to(`user-${membership.userId}`)
          .to(`collection-${membership.collectionId}`)
          .emit(event.name, presentMembership(membership));
        socketio
          .in(`user-${event.userId}`)
          .socketsJoin(`collection-${event.collectionId}`);
        return;
      }

      case "collections.remove_user": {
        const [collection, user] = await Promise.all([
          Collection.findByPk(event.collectionId, {
            userId: event.userId,
          }),
          User.findByPk(event.userId),
        ]);
        if (!user) {
          return;
        }

        const membership = {
          userId: event.userId,
          collectionId: event.collectionId,
          id: event.modelId,
        };

        // let everyone with access to the collection know a user was removed
        socketio
          .to(`collection-${event.collectionId}`)
          .emit("collections.remove_user", membership);

        if (cannot(user, "read", collection)) {
          socketio
            .in(`user-${event.userId}`)
            .socketsLeave(`collection-${event.collectionId}`);
        }

        return;
      }

      case "collections.add_group": {
        const membership = await GroupMembership.findByPk(
          event.data.membershipId
        );
        if (!membership) {
          return;
        }

        socketio
          .to(`group-${membership.groupId}`)
          .to(`collection-${membership.collectionId}`)
          .emit(event.name, presentGroupMembership(membership));
        socketio
          .in(`group-${membership.groupId}`)
          .socketsJoin(`collection-${event.collectionId}`);

        return;
      }

      case "collections.remove_group": {
        // let everyone with access to the collection know a group was removed
        // this includes those in the group itself
        socketio
          .to(`collection-${event.collectionId}`)
          .emit("collections.remove_group", {
            groupId: event.modelId,
            collectionId: event.collectionId,
            id: event.data.membershipId,
          });

        await GroupUser.findAllInBatches<GroupUser>(
          {
            where: { groupId: event.modelId },
            batchLimit: 100,
          },
          async (groupUsers) => {
            for (const groupUser of groupUsers) {
              const [collection, user] = await Promise.all([
                Collection.findByPk(event.collectionId, {
                  userId: groupUser.userId,
                }),
                User.findByPk(groupUser.userId),
              ]);
              if (!user) {
                continue;
              }

              if (cannot(user, "read", collection)) {
                socketio
                  .in(`user-${groupUser.userId}`)
                  .socketsLeave(`collection-${event.collectionId}`);
              }
            }
          }
        );

        return;
      }

      case "fileOperations.create":
      case "fileOperations.update": {
        const fileOperation = await FileOperation.findByPk(event.modelId);
        if (!fileOperation) {
          return;
        }
        return socketio
          .to(`user-${event.actorId}`)
          .emit(event.name, presentFileOperation(fileOperation));
      }

      case "imports.create":
      case "imports.update": {
        const importModel = await Import.findByPk(event.modelId);
        if (!importModel) {
          return;
        }

        return socketio
          .to(`user-${event.actorId}`)
          .emit(event.name, presentImport(importModel));
      }

      case "pins.create":
      case "pins.update": {
        const pin = await Pin.findByPk(event.modelId);
        if (!pin) {
          return;
        }
        return socketio
          .to(
            pin.collectionId
              ? `collection-${pin.collectionId}`
              : `team-${pin.teamId}`
          )
          .emit(event.name, presentPin(pin));
      }

      case "pins.delete": {
        return socketio
          .to(
            event.collectionId
              ? `collection-${event.collectionId}`
              : `team-${event.teamId}`
          )
          .emit(event.name, {
            modelId: event.modelId,
          });
      }

      case "comments.create":
      case "comments.update": {
        const comment = await Comment.findByPk(event.modelId, {
          include: [
            {
              model: Document.scope("withDrafts"),
              as: "document",
              required: true,
            },
          ],
        });
        if (!comment) {
          return;
        }

        const channels = await this.getDocumentEventChannels(
          event,
          comment.document
        );
        return socketio.to(channels).emit(event.name, presentComment(comment));
      }

      case "comments.delete": {
        const comment = await Comment.findByPk(event.modelId, {
          paranoid: false,
          include: [
            {
              model: Document.scope("withDrafts"),
              as: "document",
              required: true,
            },
          ],
        });
        if (!comment) {
          return;
        }

        const channels = await this.getDocumentEventChannels(
          event,
          comment.document
        );
        return socketio.to(channels).emit(event.name, {
          modelId: event.modelId,
        });
      }

      case "comments.add_reaction":
      case "comments.remove_reaction": {
        const comment = await Comment.findByPk(event.modelId, {
          include: [
            {
              model: Document.scope("withDrafts"),
              as: "document",
              required: true,
            },
          ],
        });
        if (!comment) {
          return;
        }

        const user = await User.findByPk(event.actorId);
        if (!user) {
          return;
        }

        const channels = await this.getDocumentEventChannels(
          event,
          comment.document
        );
        return socketio.to(channels).emit(event.name, {
          emoji: event.data.emoji,
          commentId: event.modelId,
          user: presentUser(user),
        });
      }

      case "notifications.create":
      case "notifications.update": {
        const notification = await Notification.findByPk(event.modelId);
        if (!notification) {
          return;
        }

        const data = await presentNotification(undefined, notification);
        return socketio.to(`user-${event.userId}`).emit(event.name, data);
      }

      case "notifications.delete": {
        return socketio.to(`user-${event.userId}`).emit(event.name, {
          modelId: event.modelId,
        });
      }

      case "stars.create":
      case "stars.update": {
        const star = await Star.findByPk(event.modelId);
        if (!star) {
          return;
        }
        return socketio
          .to(`user-${event.userId}`)
          .emit(event.name, presentStar(star));
      }

      case "stars.delete": {
        return socketio.to(`user-${event.userId}`).emit(event.name, {
          modelId: event.modelId,
        });
      }

      case "groups.create":
      case "groups.update": {
        const group = await Group.findByPk(event.modelId, {
          paranoid: false,
        });
        if (!group) {
          return;
        }
        return socketio
          .to(`team-${group.teamId}`)
          .emit(event.name, await presentGroup(group));
      }

      case "groups.add_user": {
        // do an add user for every collection that the group is a part of
        const groupUser = await GroupUser.findOne({
          where: {
            groupId: event.modelId,
            userId: event.userId,
          },
        });
        if (!groupUser) {
          return;
        }

        socketio
          .to(`team-${event.teamId}`)
          .emit("groups.add_user", presentGroupUser(groupUser));
        socketio
          .in(`user-${event.userId}`)
          .socketsJoin(`group-${event.modelId}`);

        await GroupMembership.findAllInBatches<GroupMembership>(
          {
            where: {
              groupId: event.modelId,
            },
            batchLimit: 100,
          },
          async (groupMemberships) => {
            for (const groupMembership of groupMemberships) {
              if (groupMembership.collectionId) {
                socketio
                  .to(`user-${event.userId}`)
                  .emit(
                    "collections.add_group",
                    presentGroupMembership(groupMembership)
                  );
                socketio
                  .in(`user-${event.userId}`)
                  .socketsJoin(`collection-${groupMembership.collectionId}`);
              }
              if (groupMembership.documentId) {
                socketio
                  .to(`user-${event.userId}`)
                  .emit(
                    "documents.add_group",
                    presentGroupMembership(groupMembership)
                  );
              }
            }
          }
        );

        return;
      }

      case "groups.remove_user": {
        const membership = {
          event: event.name,
          userId: event.userId,
          groupId: event.modelId,
        };

        // let everyone with access to the group know a user was removed
        socketio
          .to(`team-${event.teamId}`)
          .emit("groups.remove_user", membership);
        socketio
          .in(`user-${event.userId}`)
          .socketsLeave(`group-${event.modelId}`);

        const user = await User.findByPk(event.userId);
        if (!user) {
          return;
        }

        await GroupMembership.findAllInBatches<GroupMembership>(
          {
            where: {
              groupId: event.modelId,
            },
            batchLimit: 100,
          },
          async (groupMemberships) => {
            for (const groupMembership of groupMemberships) {
              if (!groupMembership.collectionId) {
                continue;
              }

              socketio
                .to(`user-${event.userId}`)
                .emit(
                  "collections.remove_group",
                  presentGroupMembership(groupMembership)
                );

              const collection = await Collection.findByPk(
                groupMembership.collectionId,
                {
                  userId: event.userId,
                }
              );

              if (cannot(user, "read", collection)) {
                socketio
                  .in(`user-${event.userId}`)
                  .socketsLeave(`collection-${groupMembership.collectionId}`);
              }
            }
          }
        );

        return;
      }

      case "groups.delete": {
        socketio.to(`team-${event.teamId}`).emit(event.name, {
          modelId: event.modelId,
        });
        socketio
          .in(`group-${event.modelId}`)
          .socketsLeave(`group-${event.modelId}`);

        const groupMemberships = await GroupMembership.findAll({
          where: {
            groupId: event.modelId,
          },
        });

        await GroupUser.findAllInBatches<GroupUser>(
          {
            where: {
              groupId: event.modelId,
            },
            include: [
              {
                association: "user",
                required: true,
              },
            ],
            batchLimit: 100,
          },
          async (groupUsers) => {
            for (const groupMembership of groupMemberships) {
              const payload = presentGroupMembership(groupMembership);

              if (groupMembership.collectionId) {
                for (const groupUser of groupUsers) {
                  socketio
                    .to(`user-${groupUser.userId}`)
                    .emit("collections.remove_group", payload);

                  const collection = await Collection.findByPk(
                    groupMembership.collectionId,
                    {
                      userId: groupUser.userId,
                    }
                  );

                  if (cannot(groupUser.user, "read", collection)) {
                    socketio
                      .in(`user-${groupUser.userId}`)
                      .socketsLeave(
                        `collection-${groupMembership.collectionId}`
                      );
                  }
                }
              }

              if (groupMembership.documentId) {
                for (const groupUser of groupUsers) {
                  socketio
                    .to(`user-${groupUser.userId}`)
                    .emit("documents.remove_group", payload);
                }
              }
            }
          }
        );

        return;
      }

      case "subscriptions.create": {
        const subscription = await Subscription.findByPk(event.modelId);
        if (!subscription) {
          return;
        }
        return socketio
          .to(`user-${event.userId}`)
          .emit(event.name, presentSubscription(subscription));
      }

      case "subscriptions.delete": {
        return socketio.to(`user-${event.userId}`).emit(event.name, {
          modelId: event.modelId,
        });
      }

      case "teams.update": {
        const team = await Team.scope("withDomains").findByPk(event.teamId);
        if (!team) {
          return;
        }
        return socketio
          .to(`team-${event.teamId}`)
          .emit(event.name, presentTeam(team));
      }

      case "users.update": {
        const user = await User.findByPk(event.userId);
        if (!user) {
          return;
        }
        socketio
          .to(`user-${event.userId}`)
          .emit(event.name, presentUser(user, { includeDetails: true }));

        socketio.to(`team-${user.teamId}`).emit(event.name, presentUser(user));
        return;
      }

      case "users.promote":
      case "users.demote": {
        socketio
          .to(`user-${event.userId}`)
          .emit(event.name, { id: event.userId });

        // the user's accessible collections may have changed with their role.
        const user = await User.findByPk(event.userId);
        if (!user) {
          return;
        }

        const membersRoom = `team-${user.teamId}.members`;
        const accessibleCollectionIds = await user.collectionIds({
          skipCache: true,
        });

        if (user.isGuest) {
          const teamCollections = await Collection.findAll({
            attributes: ["id"],
            where: { teamId: user.teamId },
          });
          const accessibleCollectionIdsSet = new Set(accessibleCollectionIds);
          const inaccessibleRooms = teamCollections
            .map((collection) => collection.id)
            .filter((id) => !accessibleCollectionIdsSet.has(id))
            .map((id) => `collection-${id}`);

          return socketio
            .in(`user-${user.id}`)
            .socketsLeave([membersRoom, ...inaccessibleRooms]);
        }

        return socketio
          .in(`user-${user.id}`)
          .socketsJoin([
            membersRoom,
            ...accessibleCollectionIds.map((id) => `collection-${id}`),
          ]);
      }

      case "users.signout":
      case "users.suspend": {
        // authentication is no longer valid, disconnect all of the user's clients.
        return socketio.in(`user-${event.userId}`).disconnectSockets(true);
      }

      case "users.delete": {
        socketio
          .to(`team-${event.teamId}`)
          .emit(event.name, { modelId: event.userId });

        // authentication is no longer valid, disconnect all of the user's clients.
        return socketio.in(`user-${event.userId}`).disconnectSockets(true);
      }

      case "userMemberships.update": {
        return socketio
          .to(`user-${event.userId}`)
          .emit(event.name, { id: event.modelId, ...event.data });
      }

      default:
        return;
    }
  }

  private getCollectionEventChannels(
    event: Event,
    collection: Collection
  ): string[] {
    const channels = [];

    if (event.actorId) {
      channels.push(`user-${event.actorId}`);
    }

    // guests are never included in the team members channel, they receive
    // events via the collection channel when they have an explicit membership.
    channels.push(`collection-${collection.id}`);
    if (!collection.isPrivate) {
      channels.push(`team-${collection.teamId}.members`);
    }

    return channels;
  }

  private async getDocumentEventChannels(
    event: Event,
    document: Document
  ): Promise<string[]> {
    const channels = [];

    if (event.actorId) {
      channels.push(`user-${event.actorId}`);
    }

    if (document.publishedAt) {
      if (document.collection) {
        channels.push(
          ...this.getCollectionEventChannels(event, document.collection)
        );
      } else {
        channels.push(`collection-${document.collectionId}`);
      }
    }

    const [userMemberships, groupMemberships] = await Promise.all([
      UserMembership.findAll({
        where: {
          documentId: document.id,
        },
      }),
      GroupMembership.findAll({
        where: {
          documentId: document.id,
        },
      }),
    ]);

    for (const membership of userMemberships) {
      channels.push(`user-${membership.userId}`);
    }

    for (const membership of groupMemberships) {
      channels.push(`group-${membership.groupId}`);
    }

    return uniq(channels);
  }

  private async getTemplateEventChannels(
    event: Event,
    template: Template
  ): Promise<string[]> {
    const channels = [];

    if (event.actorId) {
      channels.push(`user-${event.actorId}`);
    }

    if (template.collectionId) {
      if (template.collection) {
        channels.push(
          ...this.getCollectionEventChannels(event, template.collection)
        );
      } else {
        channels.push(`collection-${template.collectionId}`);
      }
    } else {
      channels.push(`team-${template.teamId}`);
    }

    return uniq(channels);
  }
}
