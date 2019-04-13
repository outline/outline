// @flow
import * as React from 'react';
import { inject } from 'mobx-react';
import io from 'socket.io-client';
import DocumentsStore from 'stores/DocumentsStore';
import AuthStore from 'stores/AuthStore';
import UiStore from 'stores/UiStore';

const SocketContext = React.createContext();

type Props = {
  children: React.Node,
  documents: DocumentsStore,
  auth: AuthStore,
  ui: UiStore,
};

class SocketProvider extends React.Component<Props> {
  socket = io(window.location.origin, {
    path: '/realtime',
  });

  componentDidMount() {
    const { auth, ui, documents } = this.props;
    if (!auth.token) return;

    this.socket.on('connect', () => {
      this.socket.emit('authentication', {
        token: auth.token,
      });
      this.socket.on('unauthorized', err => {
        ui.showToast(err.message);
      });
      this.socket.on('entities', event => {
        if (event.documents) {
          event.documents.forEach(doc => documents.add(doc));
        }
      });
      this.socket.on('documents.delete', event => {
        const document = documents.get(event.documentId);
        if (document) document.deletedAt = new Date().toISOString();
      });
      this.socket.on('documents.pin', event => {
        const document = documents.get(event.documentId);
        if (document) document.pinned = true;
      });
      this.socket.on('documents.unpin', event => {
        const document = documents.get(event.documentId);
        if (document) document.pinned = false;
      });
      this.socket.on('documents.star', event => {
        const document = documents.get(event.documentId);
        if (document) document.starred = true;
      });
      this.socket.on('documents.unstar', event => {
        const document = documents.get(event.documentId);
        if (document) document.starred = false;
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

export default inject('auth', 'ui', 'documents')(SocketProvider);
