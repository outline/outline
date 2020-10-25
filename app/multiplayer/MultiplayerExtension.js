// @flow
import {
  ySyncPlugin,
  yCursorPlugin,
  yUndoPlugin,
  undo,
  redo,
} from "@tommoor/y-prosemirror";
import { keymap } from "prosemirror-keymap";
import { Extension } from "rich-markdown-editor";
import * as Y from "yjs";

export default class MultiplayerExtension extends Extension {
  get name() {
    return "multiplayer";
  }

  get plugins() {
    const { user, provider, doc } = this.options;
    const type = doc.get("prosemirror", Y.XmlFragment);

    provider.on("status", ({ status }) => {
      if (status === "connected") {
        provider.awareness.setLocalStateField("user", {
          color: user.color,
          name: user.name,
        });
      }
    });

    const permanentUserData = new Y.PermanentUserData(doc);
    permanentUserData.setUserMapping(doc, doc.clientID, user.id);

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
