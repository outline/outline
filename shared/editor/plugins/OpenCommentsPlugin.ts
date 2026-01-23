import { Plugin, PluginKey } from "prosemirror-state";

export const commentPluginKey = new PluginKey("commentPlugin");

export const createCommentPlugin = (onOpenCommentsSidebar?: () => void) => {
  return new Plugin({
    key: commentPluginKey,
    state: {
      init() {
        return { onOpenCommentsSidebar };
      },
      apply(tr, value) {
        return value;
      },
    },
  });
};
