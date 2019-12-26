// @flow
import * as React from 'react';
import { SocketContext } from 'components/SocketProvider';

type Props = {
  children?: React.Node,
  documentId: string,
};

export default class SocketManager extends React.Component<Props> {
  static contextType = SocketContext;
  previousContext: any;

  componentDidMount() {
    this.setupOnce();
  }

  componentDidUpdate() {
    this.setupOnce();
  }

  componentWillUnmount() {
    if (this.context) {
      this.context.emit('leave', { documentId: this.props.documentId });
      this.context.off('authenticated', this.join);
    }
  }

  setupOnce = () => {
    if (this.context && !this.previousContext) {
      this.previousContext = this.context;

      if (this.context.authenticated) {
        this.join();
      }
      this.context.on('authenticated', this.join);
    }
  };

  join = () => {
    if (this.context) {
      this.context.emit('join', { documentId: this.props.documentId });
    }
  };

  render() {
    return this.props.children || null;
  }
}
