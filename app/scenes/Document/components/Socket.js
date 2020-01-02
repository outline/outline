// @flow
import * as React from 'react';
import { SocketContext } from 'components/SocketProvider';
import { EDITING_PING_INTERVAL } from 'shared/constants';

type Props = {
  children?: React.Node,
  documentId: string,
  isEditing: boolean,
};

export default class Socket extends React.Component<Props> {
  static contextType = SocketContext;
  previousContext: any;
  editingInterval: IntervalID;

  componentDidMount() {
    this.editingInterval = setInterval(() => {
      if (this.props.isEditing) {
        this.emitPresence();
      }
    }, EDITING_PING_INTERVAL);
    this.setupOnce();
  }

  componentDidUpdate(prevProps: Props) {
    this.setupOnce();

    if (prevProps.isEditing !== this.props.isEditing) {
      this.emitPresence();
    }
  }

  componentWillUnmount() {
    if (this.context) {
      this.context.emit('leave', { documentId: this.props.documentId });
      this.context.off('authenticated', this.emitJoin);
    }

    clearInterval(this.editingInterval);
  }

  setupOnce = () => {
    if (this.context && !this.previousContext) {
      this.previousContext = this.context;

      if (this.context.authenticated) {
        this.emitJoin();

        if (this.props.isEditing) {
          this.emitPresence();
        }
      }
      this.context.on('authenticated', () => {
        this.emitJoin();
      });
    }
  };

  emitJoin = () => {
    if (!this.context) return;

    this.context.emit('join', {
      documentId: this.props.documentId,
      isEditing: this.props.isEditing,
    });
  };

  emitPresence = () => {
    if (!this.context) return;

    this.context.emit('presence', {
      documentId: this.props.documentId,
      isEditing: this.props.isEditing,
    });
  };

  render() {
    return this.props.children || null;
  }
}
