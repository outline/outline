import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { ProsemirrorHelper } from "../../utils/ProsemirrorHelper";
import { isRemoteTransaction, mapDecorations } from "../lib/multiplayer";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";

interface DraftAnchorMeta {
  add?: {
    /** The id of the pending comment. */
    id: string;
    /** Start position of the highlighted range. */
    from: number;
    /** End position of the highlighted range. */
    to: number;
    /** Whether the anchor targets a node rather than a text range. */
    isNode: boolean;
    /** The id of the user that created the pending comment. */
    userId?: string;
  };
  remove?: { id: string };
}

interface PluginState {
  decorations: DecorationSet;
}

export const draftCommentAnchorPluginKey = new PluginKey<PluginState>(
  "draft-comment-anchor"
);

/**
 * Plugin that renders a local-only highlight for pending inline comments
 * created by users without edit access. These users cannot write the comment
 * mark into the document, so the highlight is displayed as a decoration until
 * the server applies the real mark and it syncs down, at which point the
 * decoration is removed.
 */
export class DraftCommentAnchorPlugin extends Plugin<PluginState> {
  constructor() {
    super({
      key: draftCommentAnchorPluginKey,
      state: {
        init: (): PluginState => ({
          decorations: DecorationSet.empty,
        }),
        apply: (tr, pluginState, _oldState, newState): PluginState => {
          const meta = tr.getMeta(draftCommentAnchorPluginKey) as
            | DraftAnchorMeta
            | undefined;

          if (!meta && !tr.docChanged) {
            return pluginState;
          }

          let decorations = mapDecorations(
            pluginState.decorations,
            tr,
            newState
          );

          if (meta?.add) {
            const { id, from, to, isNode, userId } = meta.add;
            decorations = decorations.add(tr.doc, [
              isNode
                ? Decoration.node(
                    from,
                    to,
                    { class: "image-commented" },
                    { id }
                  )
                : Decoration.inline(
                    from,
                    to,
                    {
                      class: EditorStyleHelper.comment,
                      id: `comment-${id}`,
                      "data-draft": "true",
                      "data-user-id": userId ?? "",
                    },
                    { id }
                  ),
            ]);
          }
          if (meta?.remove) {
            const { id } = meta.remove;
            decorations = decorations.remove(
              decorations.find(undefined, undefined, (spec) => spec.id === id)
            );
          }

          // Once the server-applied comment mark syncs down we can drop the
          // local decoration in favor of the real mark.
          if (
            tr.docChanged &&
            isRemoteTransaction(tr, newState) &&
            decorations.find().length > 0
          ) {
            const markIds = new Set(
              ProsemirrorHelper.getComments(newState.doc).map((mark) => mark.id)
            );
            decorations = decorations.remove(
              decorations.find(undefined, undefined, (spec) =>
                markIds.has(spec.id)
              )
            );
          }

          return { decorations };
        },
      },
      props: {
        decorations(state) {
          return draftCommentAnchorPluginKey.getState(state)?.decorations;
        },
      },
    });
  }
}
