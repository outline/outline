// @flow
import * as React from 'react';
import { inject } from 'mobx-react';
import io from 'socket.io-client';
import DocumentsStore from 'stores/DocumentsStore';
import CollectionsStore from 'stores/CollectionsStore';
import MembershipsStore from 'stores/MembershipsStore';
import AuthStore from 'stores/AuthStore';
import UiStore from 'stores/UiStore';

const SocketContext = React.createContext();

type Props = {
  children: React.Node,
  documents: DocumentsStore,
  collections: CollectionsStore,
  memberships: MembershipsStore,
  auth: AuthStore,
  ui: UiStore,
};

class SocketProvider extends React.Component<Props> {
  socket;

  componentDidMount() {
    if (!process.env.WEBSOCKETS_ENABLED) return;

    this.socket = io(window.location.origin, {
      path: '/realtime',
    });

    const { auth, ui, documents, collections, memberships } = this.props;
    if (!auth.token) return;

    this.socket.on('connect', () => {
      this.socket.emit('authentication', {
        token: auth.token,
      });
      this.socket.on('unauthorized', err => {
        ui.showToast(err.message);
        throw err;
      });
      this.socket.on('entities', event => {
        if (event.documents) {
          event.documents.forEach(doc => {
            if (doc.deletedAt) {
              documents.remove(doc.id);
            } else {
              documents.add(doc);
            }

            // TODO: Move this to the document scene once data loading
            // has been refactored to be friendlier there.
            if (
              auth.user &&
              doc.id === ui.activeDocumentId &&
              doc.updatedBy.id !== auth.user.id
            ) {
              ui.showToast(`Document updated by ${doc.updatedBy.name}`, {
                timeout: 30 * 1000,
                action: {
                  text: 'Refresh',
                  onClick: () => window.location.reload(),
                },
              });
            }
          });
        }

        if (event.collections) {
          event.collections.forEach(collection => {
            if (collection.deletedAt) {
              collections.remove(collection.id);
              documents.removeCollectionDocuments(collection.id);
            } else {
              collections.add(collection);
            }
          });
        }
      });

      this.socket.on('documents.star', event => {
        documents.starredIds.set(event.documentId, true);
      });

      this.socket.on('documents.unstar', event => {
        documents.starredIds.set(event.documentId, false);
      });

      this.socket.on('collections.update', event => {
        const previous = collections.get(event.collectionId);
        const previousPrivate = previous ? previous.private : undefined;

        if (previousPrivate !== event.private) {
          collections.fetch(event.collectionId, { force: true });
          memberships.removeCollectionMemberships(event.collectionId);
        }
      });

      this.socket.on('collections.add_user', event => {
        if (auth.user && event.userId === auth.user.id) {
          collections.fetch(event.collectionId, { force: true });
        }
      });

      this.socket.on('collections.remove_user', event => {
        if (auth.user && event.userId === auth.user.id) {
          collections.remove(event.collectionId);
          memberships.removeCollectionMemberships(event.collectionId);
          documents.removeCollectionDocuments(event.collectionId);
        } else {
          memberships.remove(`${event.userId}-${event.collectionId}`);
        }
      });

      // received a message from the API server that we should request
      // to join a specific room. Forward that to the ws server.
      this.socket.on('join', event => {
        this.socket.emit('join', event);
      });

      // received a message from the API server that we should request
      // to leave a specific room. Forward that to the ws server.
      this.socket.on('leave', event => {
        this.socket.emit('leave', event);
      });
    });
  }

  render() {
    return (
      <SocketContext.Provider value={this.socket}>
        {this.props.children}
      </SocketContext.Provider>
    );
  }
}

export default inject('auth', 'ui', 'documents', 'collections', 'memberships')(
  SocketProvider
);
