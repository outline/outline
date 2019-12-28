// @flow
import * as React from 'react';
import { SocketContext } from 'components/SocketProvider';

type Props = {
  children?: React.Node,
  documentId: string,
  editing: boolean,
};

export default class SocketManager extends React.Component<Props> {
  static contextType = SocketContext;
  previousContext: any;
  editingInterval: IntervalID;

  componentDidMount() {
    this.editingInterval = setInterval(() => {
      if (this.props.editing) {
        this.emitEditing();
      }
    }, 5000);
    this.setupOnce();
  }

  componentDidUpdate() {
    this.setupOnce();
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

        if (this.props.editing) {
          this.emitEditing();
        }
      }
      this.context.on('authenticated', this.emitJoin);
    }
  };

  emitJoin = () => {
    if (this.context) {
      this.context.emit('join', { documentId: this.props.documentId });
    }
  };

  emitEditing = () => {
    if (this.context) {
      this.context.emit('editing', { documentId: this.props.documentId });
    }
  };

  render() {
    return this.props.children || null;
  }
}
