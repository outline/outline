// @flow
import * as React from "react";
import { USER_PRESENCE_INTERVAL } from "shared/constants";
import { SocketContext } from "components/SocketProvider";

type Props = {
  children?: React.Node,
  documentId: string,
  isEditing: boolean,
};

export default class SocketPresence extends React.Component<Props> {
  static contextType = SocketContext;
  previousContext: any;
  editingInterval: IntervalID;

  componentDidMount() {
    this.editingInterval = setInterval(() => {
      if (this.props.isEditing) {
        this.emitPresence();
      }
    }, USER_PRESENCE_INTERVAL);
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
      this.context.emit("leave", { documentId: this.props.documentId });
      this.context.off("authenticated", this.emitJoin);
    }

    clearInterval(this.editingInterval);
  }

  setupOnce = () => {
    if (this.context && this.context !== this.previousContext) {
      this.previousContext = this.context;

      if (this.context.authenticated) {
        this.emitJoin();
      }
      this.context.on("authenticated", () => {
        this.emitJoin();
      });
    }
  };

  emitJoin = () => {
    if (!this.context) return;

    this.context.emit("join", {
      documentId: this.props.documentId,
      isEditing: this.props.isEditing,
    });
  };

  emitPresence = () => {
    if (!this.context) return;

    this.context.emit("presence", {
      documentId: this.props.documentId,
      isEditing: this.props.isEditing,
    });
  };

  render() {
    return this.props.children || null;
  }
}
