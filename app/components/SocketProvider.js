// @flow
import * as React from 'react';
import { inject } from 'mobx-react';
import io from 'socket.io-client';
import DocumentsStore from 'stores/DocumentsStore';
import CollectionsStore from 'stores/CollectionsStore';
import MembershipsStore from 'stores/MembershipsStore';
import PoliciesStore from 'stores/PoliciesStore';
import AuthStore from 'stores/AuthStore';
import UiStore from 'stores/UiStore';

const SocketContext = React.createContext();

type Props = {
  children: React.Node,
  documents: DocumentsStore,
  collections: CollectionsStore,
  memberships: MembershipsStore,
  policies: PoliciesStore,
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

    const {
      auth,
      ui,
      documents,
      collections,
      memberships,
      policies,
    } = this.props;
    if (!auth.token) return;

    this.socket.on('connect', () => {
      this.socket.emit('authentication', {
        token: auth.token,
      });

      this.socket.on('unauthorized', err => {
        ui.showToast(err.message);
        throw err;
      });

      this.socket.on('entities', async event => {
        if (event.documentIds) {
          for (const documentId of event.documentIds) {
            const document = await documents.fetch(documentId);

            // TODO: Move this to the document scene once data loading
            // has been refactored to be friendlier there.
            if (
              auth.user &&
              documentId === ui.activeDocumentId &&
              document.updatedBy.id !== auth.user.id
            ) {
              ui.showToast(`Document updated by ${document.updatedBy.name}`, {
                timeout: 30 * 1000,
                action: {
                  text: 'Refresh',
                  onClick: () => window.location.reload(),
                },
              });
            }
          }
        }

        if (event.collectionIds) {
          for (const collectionId of event.collectionIds) {
            try {
              await collections.fetch(collectionId, { force: true });
            } catch (err) {
              if (err.statusCode === 404 || err.statusCode === 403) {
                collections.remove(collectionId);
                documents.removeCollectionDocuments(collectionId);
                memberships.removeCollectionMemberships(collectionId);
              }
            }
          }
        }
      });

      this.socket.on('documents.star', event => {
        documents.starredIds.set(event.documentId, true);
      });

      this.socket.on('documents.unstar', event => {
        documents.starredIds.set(event.documentId, false);
      });

      this.socket.on('collections.add_user', event => {
        if (auth.user && event.userId === auth.user.id) {
          collections.fetch(event.collectionId, { force: true });
        }

        // Document policies might need updating as the permission changes
        documents.inCollection(event.collectionId).forEach(document => {
          policies.remove(document.id);
        });
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

export default inject(
  'auth',
  'ui',
  'documents',
  'collections',
  'memberships',
  'policies'
)(SocketProvider);
