import { subHours } from "date-fns";
import { Op } from "sequelize";
import { Server } from "socket.io";
import {
  Comment,
  Document,
  Collection,
  FileOperation,
  Group,
  CollectionGroup,
  GroupUser,
  Pin,
  Star,
  Team,
  Subscription,
  Notification,
} from "@server/models";
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
} from "@server/presenters";
import presentNotification from "@server/presenters/notification";
import { Event } from "../../types";

export default class WebsocketsProcessor {
  async perform(event: Event, socketio: Server) {
    switch (event.name) {
      case "documents.publish":
      case "documents.unpublish":
      case "documents.restore":
      case "documents.unarchive": {
        const document = await Document.findByPk(event.documentId, {
          paranoid: false,
        });
        if (!document) {
          return;
        }

        const channel = document.publishedAt
          ? `collection-${document.collectionId}`
          : `user-${event.actorId}`;
        return socketio.to(channel).emit("entities", {
          event: event.name,
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
        const channel = document.publishedAt
          ? `collection-${document.collectionId}`
          : `user-${event.actorId}`;

        const data = await presentDocument(document);
        return socketio.to(channel).emit(event.name, data);
      }

      case "documents.create": {
        const document = await Document.findByPk(event.documentId);
        if (!document) {
          return;
        }
        return socketio.to(`user-${event.actorId}`).emit("entities", {
          event: event.name,
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

      case "collections.create": {
        const collection = await Collection.findByPk(event.collectionId, {
          paranoid: false,
        });
        if (!collection) {
          return;
        }
        socketio
          .to(
            collection.permission
              ? `team-${collection.teamId}`
              : `user-${collection.createdById}`
          )
          .emit(event.name, presentCollection(collection));

        return socketio
          .to(
            collection.permission
              ? `team-${collection.teamId}`
              : `user-${collection.createdById}`
          )
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
          .to(
            collection.permission
              ? `collection-${event.collectionId}`
              : `team-${collection.teamId}`
          )
          .emit(event.name, presentCollection(collection));
      }

      case "collections.delete": {
        const collection = await Collection.findByPk(event.collectionId, {
          paranoid: false,
        });
        if (!collection) {
          return;
        }

        return socketio
          .to(
            collection.permission
              ? `collection-${event.collectionId}`
              : `team-${collection.teamId}`
          )
          .emit(event.name, {
            modelId: event.collectionId,
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
        // the user being added isn't yet in the websocket channel for the collection
        // so they need to be notified separately
        socketio.to(`user-${event.userId}`).emit(event.name, {
          event: event.name,
          userId: event.userId,
          collectionId: event.collectionId,
        });
        // let everyone with access to the collection know a user was added
        socketio.to(`collection-${event.collectionId}`).emit(event.name, {
          event: event.name,
          userId: event.userId,
          collectionId: event.collectionId,
        });
        // tell any user clients to connect to the websocket channel for the collection
        return socketio.to(`user-${event.userId}`).emit("join", {
          event: event.name,
          collectionId: event.collectionId,
        });
      }

      case "collections.remove_user": {
        const membershipUserIds = await Collection.membershipUserIds(
          event.collectionId
        );

        if (membershipUserIds.includes(event.userId)) {
          // Even though we just removed a user from the collection
          // the user still has access through some means
          // treat this like an add, so that the client re-syncs policies
          socketio.to(`user-${event.userId}`).emit("collections.add_user", {
            event: "collections.add_user",
            userId: event.userId,
            collectionId: event.collectionId,
          });
        } else {
          // let everyone with access to the collection know a user was removed
          socketio
            .to(`collection-${event.collectionId}`)
            .emit("collections.remove_user", {
              event: event.name,
              userId: event.userId,
              collectionId: event.collectionId,
            });
          // tell any user clients to disconnect from the websocket channel for the collection
          socketio.to(`user-${event.userId}`).emit("leave", {
            event: event.name,
            collectionId: event.collectionId,
          });
        }

        return;
      }

      case "collections.add_group": {
        const group = await Group.findByPk(event.modelId);
        if (!group) {
          return;
        }

        // the users being added are not yet in the websocket channel for the collection
        // so they need to be notified separately
        for (const groupMembership of group.groupMemberships) {
          socketio
            .to(`user-${groupMembership.userId}`)
            .emit("collections.add_user", {
              event: event.name,
              userId: groupMembership.userId,
              collectionId: event.collectionId,
            });
          // tell any user clients to connect to the websocket channel for the collection
          socketio.to(`user-${groupMembership.userId}`).emit("join", {
            event: event.name,
            collectionId: event.collectionId,
          });
        }

        return;
      }

      case "collections.remove_group": {
        const group = await Group.findByPk(event.modelId);
        if (!group) {
          return;
        }

        const membershipUserIds = await Collection.membershipUserIds(
          event.collectionId
        );

        for (const groupMembership of group.groupMemberships) {
          if (membershipUserIds.includes(groupMembership.userId)) {
            // the user still has access through some means...
            // treat this like an add, so that the client re-syncs policies
            socketio
              .to(`user-${groupMembership.userId}`)
              .emit("collections.add_user", {
                event: event.name,
                userId: groupMembership.userId,
                collectionId: event.collectionId,
              });
          } else {
            // let users in the channel know they were removed
            socketio
              .to(`user-${groupMembership.userId}`)
              .emit("collections.remove_user", {
                event: event.name,
                userId: groupMembership.userId,
                collectionId: event.collectionId,
              });
            // tell any user clients to disconnect to the websocket channel for the collection
            socketio.to(`user-${groupMembership.userId}`).emit("leave", {
              event: event.name,
              collectionId: event.collectionId,
            });
          }
        }

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
        const comment = await Comment.scope([
          "defaultScope",
          "withDocument",
        ]).findByPk(event.modelId);
        if (!comment) {
          return;
        }
        return socketio
          .to(`collection-${comment.document.collectionId}`)
          .emit(event.name, presentComment(comment));
      }

      case "comments.delete": {
        return socketio
          .to(`collection-${event.collectionId}`)
          .emit(event.name, {
            modelId: event.modelId,
          });
      }

      case "notifications.create":
      case "notifications.update": {
        const notification = await Notification.findByPk(event.modelId);
        if (!notification) {
          return;
        }

        const data = await presentNotification(notification);
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
          .emit(event.name, presentGroup(group));
      }

      case "groups.add_user": {
        // do an add user for every collection that the group is a part of
        const collectionGroupMemberships = await CollectionGroup.findAll({
          where: {
            groupId: event.modelId,
          },
        });

        for (const collectionGroup of collectionGroupMemberships) {
          // the user being added isn't yet in the websocket channel for the collection
          // so they need to be notified separately
          socketio.to(`user-${event.userId}`).emit("collections.add_user", {
            event: event.name,
            userId: event.userId,
            collectionId: collectionGroup.collectionId,
          });
          // let everyone with access to the collection know a user was added
          socketio
            .to(`collection-${collectionGroup.collectionId}`)
            .emit("collections.add_user", {
              event: event.name,
              userId: event.userId,
              collectionId: collectionGroup.collectionId,
            });
          // tell any user clients to connect to the websocket channel for the collection
          return socketio.to(`user-${event.userId}`).emit("join", {
            event: event.name,
            collectionId: collectionGroup.collectionId,
          });
        }

        return;
      }

      case "groups.remove_user": {
        const collectionGroupMemberships = await CollectionGroup.findAll({
          where: {
            groupId: event.modelId,
          },
        });

        for (const collectionGroup of collectionGroupMemberships) {
          // if the user has any memberships remaining on the collection
          // we need to emit add instead of remove
          const collection = await Collection.scope({
            method: ["withMembership", event.userId],
          }).findByPk(collectionGroup.collectionId);

          if (!collection) {
            continue;
          }

          const hasMemberships =
            collection.memberships.length > 0 ||
            collection.collectionGroupMemberships.length > 0;

          if (hasMemberships) {
            // the user still has access through some means...
            // treat this like an add, so that the client re-syncs policies
            socketio.to(`user-${event.userId}`).emit("collections.add_user", {
              event: event.name,
              userId: event.userId,
              collectionId: collectionGroup.collectionId,
            });
          } else {
            // let everyone with access to the collection know a user was removed
            socketio
              .to(`collection-${collectionGroup.collectionId}`)
              .emit("collections.remove_user", {
                event: event.name,
                userId: event.userId,
                collectionId: collectionGroup.collectionId,
              });
            // tell any user clients to disconnect from the websocket channel for the collection
            socketio.to(`user-${event.userId}`).emit("leave", {
              event: event.name,
              collectionId: collectionGroup.collectionId,
            });
          }
        }

        return;
      }

      case "groups.delete": {
        socketio.to(`team-${event.teamId}`).emit(event.name, {
          modelId: event.modelId,
        });

        // we get users and collection relations that were just severed as a
        // result of the group deletion since there are cascading deletes, we
        // approximate this by looking for the recently deleted items in the
        // GroupUser and CollectionGroup tables
        const groupUsers = await GroupUser.findAll({
          paranoid: false,
          where: {
            groupId: event.modelId,
            deletedAt: {
              [Op.gt]: subHours(new Date(), 1),
            },
          },
        });
        const collectionGroupMemberships = await CollectionGroup.findAll({
          paranoid: false,
          where: {
            groupId: event.modelId,
            deletedAt: {
              [Op.gt]: subHours(new Date(), 1),
            },
          },
        });

        for (const collectionGroup of collectionGroupMemberships) {
          const membershipUserIds = await Collection.membershipUserIds(
            collectionGroup.collectionId
          );

          for (const groupUser of groupUsers) {
            if (membershipUserIds.includes(groupUser.userId)) {
              // the user still has access through some means...
              // treat this like an add, so that the client re-syncs policies
              socketio
                .to(`user-${groupUser.userId}`)
                .emit("collections.add_user", {
                  event: event.name,
                  userId: groupUser.userId,
                  collectionId: collectionGroup.collectionId,
                });
            } else {
              // let everyone with access to the collection know a user was removed
              socketio
                .to(`collection-${collectionGroup.collectionId}`)
                .emit("collections.remove_user", {
                  event: event.name,
                  userId: groupUser.userId,
                  collectionId: collectionGroup.collectionId,
                });
              // tell any user clients to disconnect from the websocket channel for the collection
              socketio.to(`user-${groupUser.userId}`).emit("leave", {
                event: event.name,
                collectionId: collectionGroup.collectionId,
              });
            }
          }
        }

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

      default:
        return;
    }
  }
}
