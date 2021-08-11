// @flow
import { keymap } from "prosemirror-keymap";
import { Extension } from "rich-markdown-editor";
import {
  ySyncPlugin,
  yCursorPlugin,
  yUndoPlugin,
  undo,
  redo,
} from "y-prosemirror";
import * as Y from "yjs";

export default class MultiplayerExtension extends Extension {
  get name() {
    return "multiplayer";
  }

  get plugins() {
    const { user, provider, document: doc } = this.options;
    const type = doc.get("default", Y.XmlFragment);

    const assignUser = (tr) => {
      const clientIds = Array.from(doc.store.clients.keys());

      if (
        tr.local &&
        tr.changed.size > 0 &&
        !clientIds.includes(doc.clientID)
      ) {
        const permanentUserData = new Y.PermanentUserData(doc);
        permanentUserData.setUserMapping(doc, doc.clientID, user.id);
        doc.off("afterTransaction", assignUser);
      }
    };

    provider.on("status", ({ status }) => {
      if (status === "connected") {
        provider.awareness.setLocalStateField("user", user);
      }
    });

    doc.on("afterTransaction", assignUser);

    return [
      ySyncPlugin(type),
      yCursorPlugin(provider.awareness),
      yUndoPlugin(),
      keymap({
        "Mod-z": undo,
        "Mod-y": redo,
        "Mod-Shift-z": redo,
      }),
    ];
  }
}
