import * as React from "react";
import { USER_PRESENCE_INTERVAL } from "@shared/constants";
import { WebsocketContext } from "~/components/WebsocketProvider";

type Props = {
  documentId: string;
  isEditing: boolean;
  presence: boolean;
};

export default class SocketPresence extends React.Component<Props> {
  static contextType = WebsocketContext;

  previousContext: typeof WebsocketContext;

  editingInterval: ReturnType<typeof setInterval> | undefined;

  componentDidMount() {
    this.editingInterval = this.props.presence
      ? setInterval(() => {
          if (this.props.isEditing) {
            this.emitPresence();
          }
        }, USER_PRESENCE_INTERVAL)
      : undefined;
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
      this.context.emit("leave", {
        documentId: this.props.documentId,
      });
      this.context.off("authenticated", this.emitJoin);
    }

    if (this.editingInterval) {
      clearInterval(this.editingInterval);
    }
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
    if (!this.context) {
      return;
    }
    this.context.emit("join", {
      documentId: this.props.documentId,
      isEditing: this.props.isEditing,
    });
  };

  emitPresence = () => {
    if (!this.context) {
      return;
    }
    this.context.emit("presence", {
      documentId: this.props.documentId,
      isEditing: this.props.isEditing,
    });
  };

  render() {
    return this.props.children || null;
  }
}
