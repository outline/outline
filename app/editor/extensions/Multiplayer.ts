import isEqual from "lodash/isEqual";
import { Plugin } from "prosemirror-state";
import {
  ySyncPlugin,
  yCursorPlugin,
  yUndoPlugin,
  undo,
  redo,
} from "y-prosemirror";
import * as Y from "yjs";
import Extension from "@shared/editor/lib/Extension";
import { isRemoteTransaction } from "@shared/editor/lib/multiplayer";
import { Second } from "@shared/utils/time";

type UserAwareness = {
  user?: {
    id: string;
  };
  anchor: object;
  head: object;
};

export default class Multiplayer extends Extension {
  get name() {
    return "multiplayer";
  }

  get plugins() {
    const { user, provider, document: doc } = this.options;
    const type = doc.get("default", Y.XmlFragment);

    // Assign a user to a client ID once they've made a change and then remove the listener
    const assignUser = (tr: Y.Transaction) => {
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

    const userAwarenessCache = new Map<
      string,
      { aw: UserAwareness; changedAt: Date }
    >();

    // The opacity of a remote user's selection.
    const selectionOpacity = 70;

    // The time in milliseconds after which a remote user's selection will be hidden.
    const selectionTimeout = 10 * Second.ms;

    // We're hijacking this method to store the last time a user's awareness changed as a side
    // effect, and otherwise behaving as the default.
    const awarenessStateFilter = (
      currentClientId: number,
      userClientId: number,
      aw: UserAwareness
    ) => {
      if (currentClientId === userClientId) {
        return false;
      }

      const userId = aw.user?.id;
      const cached = userId ? userAwarenessCache.get(userId) : undefined;
      if (!cached || !isEqual(cached?.aw, aw)) {
        if (userId) {
          userAwarenessCache.set(userId, { aw, changedAt: new Date() });
        }
      }

      return true;
    };

    // Override the default selection builder to add a background color to the selection
    // only if the user's awareness has changed recently – this stops selections from lingering.
    const selectionBuilder = (u: { id: string; color: string }) => {
      const cached = userAwarenessCache.get(u.id);
      const opacity =
        !cached || cached?.changedAt > new Date(Date.now() - selectionTimeout)
          ? selectionOpacity
          : 0;

      return {
        style: `background-color: ${u.color}${opacity}`,
        class: "ProseMirror-yjs-selection",
      };
    };

    provider.setAwarenessField("user", user);

    // only once an actual change has been made do we add the userId <> clientId
    // mapping, this avoids stored mappings for clients that never made a change
    doc.on("afterTransaction", assignUser);

    return [
      ySyncPlugin(type),
      yCursorPlugin(provider.awareness, {
        awarenessStateFilter,
        selectionBuilder,
      }),
      yUndoPlugin(),
      new Plugin({
        props: {
          handleScrollToSelection: (view) => isRemoteTransaction(view.state.tr),
        },
      }),
    ];
  }

  commands() {
    return {
      undo: () => undo,
      redo: () => redo,
    };
  }
}
