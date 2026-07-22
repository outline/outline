import type { Node } from "prosemirror-model";
import type { EditorState, Transaction } from "prosemirror-state";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import Extension from "@shared/editor/lib/Extension";
import { changedDescendants } from "@shared/editor/lib/changedDescendants";
import { mapDecorations } from "@shared/editor/lib/multiplayer";
import { UserPreferenceDefaults } from "@shared/constants";
import { UserPreference } from "@shared/types";
import { CommentGutter as CommentGutterComponent } from "../components/CommentGutter";

/**
 * Adds an indicator in the gutter beside any line that contains an unresolved
 * comment mark, when the user has enabled the preference. Each indicator shows
 * the number of comments in the thread and opens the thread when clicked.
 */
export default class CommentGutter extends Extension {
  get name() {
    return "comment-gutter";
  }

  get allowInReadOnly() {
    return true;
  }

  get plugins() {
    const isEnabled = () =>
      this.editor.props.userPreferences?.[UserPreference.CommentsInGutter] ??
      UserPreferenceDefaults[UserPreference.CommentsInGutter];

    const handleClickCommentMark = (commentId: string) =>
      this.editor.props.onClickCommentMark?.(commentId);

    const handleHoverCommentMark = (commentId: string, hovered: boolean) => {
      this.editor.setHoveredCommentId(hovered ? commentId : null);
    };

    const handlers = {
      onClickCommentMark: handleClickCommentMark,
      onHoverCommentMark: handleHoverCommentMark,
    };

    const pluginKey = new PluginKey<{ decorations: DecorationSet }>(
      "comment-gutter"
    );

    return [
      new Plugin({
        key: pluginKey,
        state: {
          init: (_, state: EditorState) => ({
            decorations: this.createDecorations(state, handlers),
          }),
          apply: (tr, pluginState, _oldState, newState) => {
            if (!tr.docChanged) {
              return pluginState;
            }

            // Only rebuild when the comments themselves change. Otherwise map
            // the existing decorations, preserving each widget's identity so
            // the React-rendered indicators are not torn down and recreated on
            // every remote edit — churn that leaves their event handlers dead.
            // mapDecorations handles remote (Yjs) transactions, whose mapping
            // cannot be applied naively.
            if (this.hasCommentChange(tr)) {
              return {
                decorations: this.createDecorations(newState, handlers),
              };
            }

            return {
              decorations: mapDecorations(pluginState.decorations, tr),
            };
          },
        },
        props: {
          decorations: (state) => {
            if (!isEnabled()) {
              return null;
            }
            const pluginState = pluginKey.getState(state);
            return pluginState ? pluginState.decorations : null;
          },
        },
      }),
    ];
  }

  /**
   * Collect the unresolved, non-draft comment thread ids carried on a node,
   * either as inline marks or as node-level marks (e.g. on images).
   */
  private getCommentIds(node: Node): string[] {
    const ids: string[] = [];

    node.marks.forEach((mark) => {
      if (
        mark.type.name === "comment" &&
        !mark.attrs.resolved &&
        !mark.attrs.draft
      ) {
        ids.push(mark.attrs.id);
      }
    });

    if (Array.isArray(node.attrs.marks)) {
      node.attrs.marks.forEach(
        (mark: {
          type: string;
          attrs?: { id?: string; resolved?: boolean; draft?: boolean };
        }) => {
          if (
            mark.type === "comment" &&
            !mark.attrs?.resolved &&
            !mark.attrs?.draft &&
            mark.attrs?.id
          ) {
            ids.push(mark.attrs.id);
          }
        }
      );
    }

    return ids;
  }

  /**
   * Check if the transaction added, removed, or modified any node carrying a
   * comment mark, in which case the decorations need to be rebuilt.
   */
  private hasCommentChange(tr: Transaction): boolean {
    let found = false;
    const check = (node: Node) => {
      if (!found && this.getCommentIds(node).length > 0) {
        found = true;
      }
    };

    changedDescendants(tr.before, tr.doc, 0, check);
    if (!found) {
      changedDescendants(tr.doc, tr.before, 0, check);
    }
    return found;
  }

  private createDecorations(
    state: EditorState,
    handlers: {
      onClickCommentMark: (commentId: string) => void;
      onHoverCommentMark: (commentId: string, hovered: boolean) => void;
    }
  ): DecorationSet {
    // Group thread ids by the position they should be anchored to, so that a
    // line with multiple comments only renders a single gutter container.
    const groups = new Map<number, Set<string>>();

    state.doc.descendants((node, pos) => {
      const ids = this.getCommentIds(node);
      if (ids.length === 0) {
        return true;
      }

      // Anchor inline content to the start of its parent block (the line), and
      // block nodes (such as images) to just before themselves.
      const anchor = node.isInline ? state.doc.resolve(pos).start() : pos;
      const set = groups.get(anchor) ?? new Set<string>();
      ids.forEach((id) => set.add(id));
      groups.set(anchor, set);

      return true;
    });

    const decorations: Decoration[] = [];

    groups.forEach((ids, anchor) => {
      const commentIds = Array.from(ids);

      decorations.push(
        Decoration.widget(
          anchor,
          () => {
            // The mount point is layout-neutral; the rendered gutter is
            // absolutely positioned relative to the editor instead.
            const element = this.editor.renderToPortal(
              CommentGutterComponent,
              { commentIds, ...handlers },
              false
            );
            element.style.display = "contents";
            return element;
          },
          {
            key: `comment-gutter-${anchor}-${[...commentIds].sort().join("-")}`,
            side: -1,
            ignoreSelection: true,
            // Keep interactions on the indicator from reaching ProseMirror
            stopEvent: () => true,
            destroy: (node: HTMLElement) => {
              // Clear any forced hover state, otherwise it can remain stuck
              commentIds.forEach((commentId) =>
                handlers.onHoverCommentMark(commentId, false)
              );
              this.editor.destroyPortal(node);
            },
          }
        )
      );
    });

    return DecorationSet.create(state.doc, decorations);
  }
}
