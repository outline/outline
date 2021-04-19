// @flow
import { find } from "lodash";
import { observable } from "mobx";
import { inject, observer } from "mobx-react";
import * as React from "react";
import io, { Socket } from "socket.io-client";
import AuthStore from "stores/AuthStore";
import CollectionsStore from "stores/CollectionsStore";
import DocumentPresenceStore from "stores/DocumentPresenceStore";
import DocumentsStore from "stores/DocumentsStore";
import GroupsStore from "stores/GroupsStore";
import MembershipsStore from "stores/MembershipsStore";
import PoliciesStore from "stores/PoliciesStore";
import UiStore from "stores/UiStore";
import ViewsStore from "stores/ViewsStore";
import { getVisibilityListener, getPageVisible } from "utils/pageVisibility";

export const SocketContext: any = React.createContext();

type Props = {
  children: React.Node,
  documents: DocumentsStore,
  collections: CollectionsStore,
  groups: GroupsStore,
  memberships: MembershipsStore,
  presence: DocumentPresenceStore,
  policies: PoliciesStore,
  views: ViewsStore,
  auth: AuthStore,
  ui: UiStore,
};

@observer
class SocketProvider extends React.Component<Props> {
  @observable socket: Socket;

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
    if (this.socket && this.socket.disconnected && getPageVisible()) {
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

    this.socket.authenticated = false;

    const {
      auth,
      ui,
      documents,
      collections,
      groups,
      memberships,
      policies,
      presence,
      views,
    } = this.props;
    if (!auth.token) return;

    this.socket.on("connect", () => {
      // immediately send current users token to the websocket backend where it
      // is verified, if all goes well an 'authenticated' message will be
      // received in response
      this.socket.emit("authentication", {
        token: auth.token,
      });
    });

    this.socket.on("disconnect", (reason: string) => {
      // when the socket is disconnected we need to clear all presence state as
      // it's no longer reliable.
      presence.clear();
    });

    // on reconnection, reset the transports option, as the Websocket
    // connection may have failed (caused by proxy, firewall, browser, ...)
    this.socket.on("reconnect_attempt", () => {
      this.socket.io.opts.transports =
        auth.team && auth.team.domain
          ? ["websocket"]
          : ["websocket", "polling"];
    });

    this.socket.on("authenticated", () => {
      this.socket.authenticated = true;
    });

    this.socket.on("unauthorized", (err) => {
      this.socket.authenticated = false;
      ui.showToast(err.message, {
        type: "error",
      });
      throw err;
    });

    this.socket.on("entities", async (event) => {
      if (event.documentIds) {
        for (const documentDescriptor of event.documentIds) {
          const documentId = documentDescriptor.id;
          let document = documents.get(documentId) || {};

          if (event.event === "documents.delete") {
            const document = documents.get(documentId);
            if (document) {
              document.deletedAt = documentDescriptor.updatedAt;
            }
            policies.remove(documentId);

            continue;
          }

          // if we already have the latest version (it was us that performed
          // the change) then we don't need to update anything either.
          const { title, updatedAt } = document;
          if (updatedAt === documentDescriptor.updatedAt) {
            continue;
          }

          // otherwise, grab the latest version of the document
          try {
            document = await documents.fetch(documentId, {
              force: true,
            });
          } catch (err) {
            if (err.statusCode === 404 || err.statusCode === 403) {
              documents.remove(documentId);
              return;
            }
          }

          // if the title changed then we need to update the collection also
          if (title !== document.title) {
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
          const collection = collections.get(collectionId) || {};

          if (event.event === "collections.delete") {
            const collection = collections.get(collectionId);
            if (collection) {
              collection.deletedAt = collectionDescriptor.updatedAt;
            }

            const deletedDocuments = documents.inCollection(collectionId);
            deletedDocuments.forEach((doc) => {
              doc.deletedAt = collectionDescriptor.updatedAt;
              policies.remove(doc.id);
            });

            documents.removeCollectionDocuments(collectionId);
            memberships.removeCollectionMemberships(collectionId);
            collections.remove(collectionId);
            policies.remove(collectionId);
            continue;
          }

          // if we already have the latest version (it was us that performed
          // the change) then we don't need to update anything either.
          const { updatedAt } = collection;
          if (updatedAt === collectionDescriptor.updatedAt) {
            continue;
          }

          try {
            await collections.fetch(collectionId, { force: true });
          } catch (err) {
            if (err.statusCode === 404 || err.statusCode === 403) {
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
          const group = groups.get(groupId) || {};

          // if we already have the latest version (it was us that performed
          // the change) then we don't need to update anything either.
          const { updatedAt } = group;
          if (updatedAt === groupDescriptor.updatedAt) {
            continue;
          }

          try {
            await groups.fetch(groupId, { force: true });
          } catch (err) {
            if (err.statusCode === 404 || err.statusCode === 403) {
              groups.remove(groupId);
            }
          }
        }
      }
    });

    this.socket.on("documents.star", (event) => {
      documents.starredIds.set(event.documentId, true);
    });

    this.socket.on("documents.unstar", (event) => {
      documents.starredIds.set(event.documentId, false);
    });

    // received when a user is given access to a collection
    // if the user is us then we go ahead and load the collection from API.
    this.socket.on("collections.add_user", (event) => {
      if (auth.user && event.userId === auth.user.id) {
        collections.fetch(event.collectionId, { force: true });
      }

      // Document policies might need updating as the permission changes
      documents.inCollection(event.collectionId).forEach((document) => {
        policies.remove(document.id);
      });
    });

    // received when a user is removed from having access to a collection
    // to keep state in sync we must update our UI if the user is us,
    // or otherwise just remove any membership state we have for that user.
    this.socket.on("collections.remove_user", (event) => {
      if (auth.user && event.userId === auth.user.id) {
        collections.remove(event.collectionId);
        memberships.removeCollectionMemberships(event.collectionId);
        documents.removeCollectionDocuments(event.collectionId);
      } else {
        memberships.remove(`${event.userId}-${event.collectionId}`);
      }
    });

    this.socket.on("collections.update_index", (event) => {
      const collection = collections.get(event.collectionId);
      if (collection) {
        collection.updateIndex(event.index);
      }
    });

    // received a message from the API server that we should request
    // to join a specific room. Forward that to the ws server.
    this.socket.on("join", (event) => {
      this.socket.emit("join", event);
    });

    // received a message from the API server that we should request
    // to leave a specific room. Forward that to the ws server.
    this.socket.on("leave", (event) => {
      this.socket.emit("leave", event);
    });

    // received whenever we join a document room, the payload includes
    // userIds that are present/viewing and those that are editing.
    this.socket.on("document.presence", (event) => {
      presence.init(event.documentId, event.userIds, event.editingIds);
    });

    // received whenever a new user joins a document room, aka they
    // navigate to / start viewing a document
    this.socket.on("user.join", (event) => {
      presence.touch(event.documentId, event.userId, event.isEditing);
      views.touch(event.documentId, event.userId);
    });

    // received whenever a new user leaves a document room, aka they
    // navigate away / stop viewing a document
    this.socket.on("user.leave", (event) => {
      presence.leave(event.documentId, event.userId);
      views.touch(event.documentId, event.userId);
    });

    // received when another client in a document room wants to change
    // or update it's presence. Currently the only property is whether
    // the client is in editing state or not.
    this.socket.on("user.presence", (event) => {
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

export default inject(
  "auth",
  "ui",
  "documents",
  "collections",
  "groups",
  "memberships",
  "presence",
  "policies",
  "views"
)(SocketProvider);
