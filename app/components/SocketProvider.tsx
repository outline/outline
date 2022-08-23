import invariant from "invariant";
import { find } from "lodash";
import { observable } from "mobx";
import { observer } from "mobx-react";
import * as React from "react";
import { io, Socket } from "socket.io-client";
import RootStore from "~/stores/RootStore";
import FileOperation from "~/models/FileOperation";
import Pin from "~/models/Pin";
import Star from "~/models/Star";
import Team from "~/models/Team";
import withStores from "~/components/withStores";
import {
  PartialWithId,
  WebsocketCollectionUpdateIndexEvent,
  WebsocketCollectionUserEvent,
  WebsocketEntitiesEvent,
  WebsocketEntityDeletedEvent,
} from "~/types";
import { AuthorizationError, NotFoundError } from "~/utils/errors";
import { getVisibilityListener, getPageVisible } from "~/utils/pageVisibility";

type SocketWithAuthentication = Socket & {
  authenticated?: boolean;
};

export const SocketContext = React.createContext<SocketWithAuthentication | null>(
  null
);

type Props = RootStore;

@observer
class SocketProvider extends React.Component<Props> {
  @observable
  socket: SocketWithAuthentication | null;

  componentDidMount() {
    this.createConnection();
    document.addEventListener(getVisibilityListener(), this.checkConnection);
  }

  componentWillUnmount() {
    if (this.socket) {
      this.socket.authenticated = false;
      this.socket.disconnect();
    }

    document.removeEventListener(getVisibilityListener(), this.checkConnection);
  }

  checkConnection = () => {
    if (this.socket?.disconnected && getPageVisible()) {
      // null-ifying this reference is important, do not remove. Without it
      // references to old sockets are potentially held in context
      this.socket.close();
      this.socket = null;
      this.createConnection();
    }
  };

  createConnection = () => {
    this.socket = io(window.location.origin, {
      path: "/realtime",
      transports: ["websocket"],
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
    });
    invariant(this.socket, "Socket should be defined");

    this.socket.authenticated = false;
    const {
      auth,
      toasts,
      documents,
      collections,
      groups,
      pins,
      stars,
      memberships,
      policies,
      presence,
      views,
      fileOperations,
    } = this.props;
    if (!auth.token) {
      return;
    }

    this.socket.on("connect", () => {
      // immediately send current users token to the websocket backend where it
      // is verified, if all goes well an 'authenticated' message will be
      // received in response
      this.socket?.emit("authentication", {
        token: auth.token,
      });
    });

    this.socket.on("disconnect", () => {
      // when the socket is disconnected we need to clear all presence state as
      // it's no longer reliable.
      presence.clear();
    });

    // on reconnection, reset the transports option, as the Websocket
    // connection may have failed (caused by proxy, firewall, browser, ...)
    this.socket.io.on("reconnect_attempt", () => {
      if (this.socket) {
        this.socket.io.opts.transports = auth?.team?.domain
          ? ["websocket"]
          : ["websocket", "polling"];
      }
    });

    this.socket.on("authenticated", () => {
      if (this.socket) {
        this.socket.authenticated = true;
      }
    });

    this.socket.on("unauthorized", (err: Error) => {
      if (this.socket) {
        this.socket.authenticated = false;
      }
      toasts.showToast(err.message, {
        type: "error",
      });
      throw err;
    });

    this.socket.on("entities", async (event: WebsocketEntitiesEvent) => {
      if (event.documentIds) {
        for (const documentDescriptor of event.documentIds) {
          const documentId = documentDescriptor.id;
          let document = documents.get(documentId);
          const previousTitle = document?.title;

          // if we already have the latest version (it was us that performed
          // the change) then we don't need to update anything either.
          if (document?.updatedAt === documentDescriptor.updatedAt) {
            continue;
          }

          // otherwise, grab the latest version of the document
          try {
            document = await documents.fetch(documentId, {
              force: true,
            });
          } catch (err) {
            if (
              err instanceof AuthorizationError ||
              err instanceof NotFoundError
            ) {
              documents.remove(documentId);
              return;
            }
          }

          // if the title changed then we need to update the collection also
          if (document && previousTitle !== document.title) {
            if (!event.collectionIds) {
              event.collectionIds = [];
            }

            const existing = find(event.collectionIds, {
              id: document.collectionId,
            });

            if (!existing) {
              event.collectionIds.push({
                id: document.collectionId,
              });
            }
          }
        }
      }

      if (event.collectionIds) {
        for (const collectionDescriptor of event.collectionIds) {
          const collectionId = collectionDescriptor.id;
          const collection = collections.get(collectionId);

          // if we already have the latest version (it was us that performed
          // the change) then we don't need to update anything either.
          if (collection?.updatedAt === collectionDescriptor.updatedAt) {
            continue;
          }

          try {
            await collections.fetch(collectionId, {
              force: true,
            });
          } catch (err) {
            if (
              err instanceof AuthorizationError ||
              err instanceof NotFoundError
            ) {
              documents.removeCollectionDocuments(collectionId);
              memberships.removeCollectionMemberships(collectionId);
              collections.remove(collectionId);
              policies.remove(collectionId);
              return;
            }
          }
        }
      }

      if (event.groupIds) {
        for (const groupDescriptor of event.groupIds) {
          const groupId = groupDescriptor.id;
          const group = groups.get(groupId);

          // if we already have the latest version (it was us that performed
          // the change) then we don't need to update anything either.
          if (group?.updatedAt === groupDescriptor.updatedAt) {
            continue;
          }

          try {
            await groups.fetch(groupId, {
              force: true,
            });
          } catch (err) {
            if (
              err instanceof AuthorizationError ||
              err instanceof NotFoundError
            ) {
              groups.remove(groupId);
            }
          }
        }
      }
    });

    this.socket.on("documents.delete", (event: WebsocketEntityDeletedEvent) => {
      const document = documents.get(event.modelId);

      if (document) {
        document.deletedAt = new Date().toISOString();
      }

      policies.remove(event.modelId);
    });

    this.socket.on(
      "documents.permanent_delete",
      (event: WebsocketEntityDeletedEvent) => {
        documents.remove(event.modelId);
      }
    );

    this.socket.on("groups.delete", (event: WebsocketEntityDeletedEvent) => {
      groups.remove(event.modelId);
    });

    this.socket.on(
      "collections.delete",
      (event: WebsocketEntityDeletedEvent) => {
        const collectionId = event.modelId;
        const deletedAt = new Date().toISOString();

        const deletedDocuments = documents.inCollection(collectionId);
        deletedDocuments.forEach((doc) => {
          doc.deletedAt = deletedAt;
          policies.remove(doc.id);
        });
        documents.removeCollectionDocuments(collectionId);
        memberships.removeCollectionMemberships(collectionId);
        collections.remove(collectionId);
        policies.remove(collectionId);
      }
    );

    this.socket.on("teams.update", (event: PartialWithId<Team>) => {
      auth.updateTeam(event);
    });

    this.socket.on("pins.create", (event: PartialWithId<Pin>) => {
      pins.add(event);
    });

    this.socket.on("pins.update", (event: PartialWithId<Pin>) => {
      pins.add(event);
    });

    this.socket.on("pins.delete", (event: WebsocketEntityDeletedEvent) => {
      pins.remove(event.modelId);
    });

    this.socket.on("stars.create", (event: PartialWithId<Star>) => {
      stars.add(event);
    });

    this.socket.on("stars.update", (event: PartialWithId<Star>) => {
      stars.add(event);
    });

    this.socket.on("stars.delete", (event: WebsocketEntityDeletedEvent) => {
      stars.remove(event.modelId);
    });

    // received when a user is given access to a collection
    // if the user is us then we go ahead and load the collection from API.
    this.socket.on(
      "collections.add_user",
      (event: WebsocketCollectionUserEvent) => {
        if (auth.user && event.userId === auth.user.id) {
          collections.fetch(event.collectionId, {
            force: true,
          });
        }

        // Document policies might need updating as the permission changes
        documents.inCollection(event.collectionId).forEach((document) => {
          policies.remove(document.id);
        });
      }
    );

    // received when a user is removed from having access to a collection
    // to keep state in sync we must update our UI if the user is us,
    // or otherwise just remove any membership state we have for that user.
    this.socket.on(
      "collections.remove_user",
      (event: WebsocketCollectionUserEvent) => {
        if (auth.user && event.userId === auth.user.id) {
          collections.remove(event.collectionId);
          memberships.removeCollectionMemberships(event.collectionId);
          documents.removeCollectionDocuments(event.collectionId);
        } else {
          memberships.remove(`${event.userId}-${event.collectionId}`);
        }
      }
    );

    this.socket.on(
      "collections.update_index",
      (event: WebsocketCollectionUpdateIndexEvent) => {
        const collection = collections.get(event.collectionId);

        if (collection) {
          collection.updateIndex(event.index);
        }
      }
    );

    this.socket.on(
      "fileOperations.create",
      (event: PartialWithId<FileOperation>) => {
        fileOperations.add(event);
      }
    );

    this.socket.on(
      "fileOperations.update",
      (event: PartialWithId<FileOperation>) => {
        fileOperations.add(event);
      }
    );

    // received a message from the API server that we should request
    // to join a specific room. Forward that to the ws server.
    this.socket.on("join", (event: any) => {
      this.socket?.emit("join", event);
    });

    // received a message from the API server that we should request
    // to leave a specific room. Forward that to the ws server.
    this.socket.on("leave", (event: any) => {
      this.socket?.emit("leave", event);
    });

    // received whenever we join a document room, the payload includes
    // userIds that are present/viewing and those that are editing.
    this.socket.on("document.presence", (event: any) => {
      presence.init(event.documentId, event.userIds, event.editingIds);
    });

    // received whenever a new user joins a document room, aka they
    // navigate to / start viewing a document
    this.socket.on("user.join", (event: any) => {
      presence.touch(event.documentId, event.userId, event.isEditing);
      views.touch(event.documentId, event.userId);
    });

    // received whenever a new user leaves a document room, aka they
    // navigate away / stop viewing a document
    this.socket.on("user.leave", (event: any) => {
      presence.leave(event.documentId, event.userId);
      views.touch(event.documentId, event.userId);
    });

    // received when another client in a document room wants to change
    // or update it's presence. Currently the only property is whether
    // the client is in editing state or not.
    this.socket.on("user.presence", (event: any) => {
      presence.touch(event.documentId, event.userId, event.isEditing);
    });
  };

  render() {
    return (
      <SocketContext.Provider value={this.socket}>
        {this.props.children}
      </SocketContext.Provider>
    );
  }
}

export default withStores(SocketProvider);
