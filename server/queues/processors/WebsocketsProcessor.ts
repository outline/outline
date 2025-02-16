import concat from "lodash/concat";
import uniq from "lodash/uniq";
import uniqBy from "lodash/uniqBy";
import { Server } from "socket.io";
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
} from "@server/presenters";
import presentNotification from "@server/presenters/notification";
import { Event } from "../../types";

export default class WebsocketsProcessor {
  public async perform(event: Event, socketio: Server) {
    switch (event.name) {
      case "documents.create":
      case "documents.publish":
      case "documents.restore": {
        const document = await Document.findByPk(event.documentId, {
          paranoid: false,
        });
        if (!document) {
          return;
        }
        if (event.name === "documents.create" && document.importId) {
          return;
        }

        const channels = await this.getDocumentEventChannels(event, document);

        return socketio.to(channels).emit("entities", {
          event: event.name,
          fetchIfMissing: true,
          documentIds: [
            {
              id: document.id,
              updatedAt: document.updatedAt,
            },
          ],
          collectionIds: [
            {
              id: document.collectionId,
            },
          ],
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
        channels.push(`collection-${event.collectionId}`);

        return socketio.to(channels).emit(event.name, {
          document: documentToPresent,
          collectionId: event.collectionId,
        });
      }

      case "documents.unarchive": {
        const [document, srcCollection] = await Promise.all([
          Document.findByPk(event.documentId, { paranoid: false }),
          Collection.findByPk(event.data.sourceCollectionId, {
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

        return socketio.to(channels).emit("entities", {
          event: event.name,
          fetchIfMissing: true,
          documentIds: [
            {
              id: document.id,
              updatedAt: document.updatedAt,
            },
          ],
          collectionIds: uniqBy(
            [
              {
                id: document.collectionId,
              },
              {
                id: srcCollection.id,
              },
            ],
            "id"
          ),
        });
      }

      case "documents.permanent_delete": {
        return socketio
          .to(`collection-${event.collectionId}`)
          .emit(event.name, {
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
        documents.forEach((document) => {
          socketio.to(`collection-${document.collectionId}`).emit("entities", {
            event: event.name,
            documentIds: [
              {
                id: document.id,
                updatedAt: document.updatedAt,
              },
            ],
          });
        });
        event.data.collectionIds.forEach((collectionId) => {
          socketio.to(`collection-${collectionId}`).emit("entities", {
            event: event.name,
            collectionIds: [
              {
                id: collectionId,
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

        socketio
          .to(this.getCollectionEventChannels(event, collection))
          .emit(event.name, await presentCollection(undefined, collection));

        return socketio
          .to(this.getCollectionEventChannels(event, collection))
          .emit("join", {
            event: event.name,
            collectionId: collection.id,
          });
      }

      case "collections.update": {
        const collection = await Collection.findByPk(event.collectionId, {
          paranoid: false,
        });
        if (!collection) {
          return;
        }

        return socketio
          .to(this.getCollectionEventChannels(event, collection))
          .emit(event.name, await presentCollection(undefined, collection));
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

        return socketio
          .to(this.getCollectionEventChannels(event, collection))
          .emit(event.name, {
            id: event.collectionId,
            archivedAt: event.data.archivedAt,
          });
      }

      case "collections.move": {
        return socketio
          .to(`collection-${event.collectionId}`)
          .emit("collections.update_index", {
            collectionId: event.collectionId,
            index: event.data.index,
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

        // tell any user clients to connect to the websocket channel for the collection
        socketio.to(`user-${event.userId}`).emit("join", {
          event: event.name,
          collectionId: event.collectionId,
        });
        return;
      }

      case "collections.remove_user": {
        const [collection, user] = await Promise.all([
          Collection.scope({
            method: ["withMembership", event.userId],
          }).findByPk(event.collectionId),
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
          // tell any user clients to disconnect from the websocket channel for the collection
          socketio.to(`user-${event.userId}`).emit("leave", {
            event: event.name,
            collectionId: event.collectionId,
          });
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

        socketio.to(`group-${membership.groupId}`).emit("join", {
          event: event.name,
          collectionId: event.collectionId,
        });

        return;
      }

      case "collections.remove_group": {
        // let everyone with access to the collection know a group was removed
        // this includes those in the the group itself
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
                Collection.scope({
                  method: ["withMembership", groupUser.userId],
                }).findByPk(event.collectionId),
                User.findByPk(groupUser.userId),
              ]);
              if (!user) {
                continue;
              }

              if (cannot(user, "read", collection)) {
                // tell any user clients to disconnect from the websocket channel for the collection
                socketio.to(`user-${groupUser.userId}`).emit("leave", {
                  event: event.name,
                  collectionId: event.collectionId,
                });
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

        socketio.to(`user-${event.userId}`).emit("join", {
          event: event.name,
          groupId: event.modelId,
        });

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

                // tell any user clients to connect to the websocket channel for the collection
                socketio.to(`user-${event.userId}`).emit("join", {
                  event: event.name,
                  collectionId: groupMembership.collectionId,
                });
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

        socketio.to(`user-${event.userId}`).emit("leave", {
          event: event.name,
          groupId: event.modelId,
        });

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

              const collection = await Collection.scope({
                method: ["withMembership", event.userId],
              }).findByPk(groupMembership.collectionId);

              if (cannot(user, "read", collection)) {
                // tell any user clients to disconnect from the websocket channel for the collection
                socketio.to(`user-${event.userId}`).emit("leave", {
                  event: event.name,
                  collectionId: groupMembership.collectionId,
                });
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
        socketio.to(`group-${event.modelId}`).emit("leave", {
          event: event.name,
          groupId: event.modelId,
        });

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

                  const collection = await Collection.scope({
                    method: ["withMembership", groupUser.userId],
                  }).findByPk(groupMembership.collectionId);

                  if (cannot(groupUser.user, "read", collection)) {
                    // tell any user clients to disconnect from the websocket channel for the collection
                    socketio.to(`user-${groupUser.userId}`).emit("leave", {
                      event: event.name,
                      collectionId: groupMembership.collectionId,
                    });
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

      case "users.demote": {
        return socketio
          .to(`user-${event.userId}`)
          .emit(event.name, { id: event.userId });
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

    if (collection.isPrivate) {
      channels.push(`collection-${collection.id}`);
    } else {
      channels.push(`team-${collection.teamId}`);
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
      } else if (document.isWorkspaceTemplate) {
        channels.push(`team-${document.teamId}`);
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
}
