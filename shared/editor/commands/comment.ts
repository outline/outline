import type { Attrs } from "prosemirror-model";
import type { Command } from "prosemirror-state";
import { NodeSelection, TextSelection } from "prosemirror-state";
import { v4 as uuidv4 } from "uuid";
import { ProsemirrorHelper } from "../../utils/ProsemirrorHelper";
import { isMarkActive } from "../queries/isMarkActive";
import { chainTransactions } from "../lib/chainTransactions";
import textBetween from "../lib/textBetween";
import { draftCommentAnchorPluginKey } from "../plugins/DraftCommentAnchorPlugin";
import { addMark } from "./addMark";
import { collapseSelection } from "./collapseSelection";
import { chainCommands } from "prosemirror-commands";

/**
 * Anchor information describing where a comment should be attached in a
 * document, matching the anchor fields accepted by the `comments.create` API.
 */
export interface CommentAnchor {
  /** Plain text of the range the comment is anchored to. */
  anchorText?: string;
  /** Plain text immediately preceding the anchored range. */
  anchorPrefix?: string;
  /** Plain text immediately following the anchored range. */
  anchorSuffix?: string;
  /** Hash identifying the node the comment is anchored to. */
  anchorNodeId?: string;
}

/** Amount of surrounding plain text captured to disambiguate an anchor. */
const anchorContextLength = 15;

/** Anchor text at least this long is treated as unambiguous on its own. */
const unambiguousAnchorLength = 30;

export const addComment = (attrs: Attrs): Command =>
  chainCommands(addCommentTextSelection(attrs), addCommentNodeSelection(attrs));

/**
 * Returns a command that records a pending inline comment anchor for the
 * current selection without modifying the document. Used by users who can
 * comment but not edit — the highlight is rendered as a local decoration and
 * the comment mark is applied server-side on submission.
 *
 * @param options.userId the id of the current user.
 * @param options.onCreate callback invoked with the pending comment id and anchor.
 * @param options.onOpenCommentsSidebar callback to open the comments sidebar.
 * @returns a prosemirror command.
 */
export const addDraftCommentAnchor =
  (options: {
    userId?: string;
    onCreate?: (
      commentId: string,
      userId: string,
      options: { focus: boolean; anchor: CommentAnchor }
    ) => void;
    onOpenCommentsSidebar?: () => void;
  }): Command =>
  (state, dispatch) => {
    const { selection, doc } = state;
    let anchor: CommentAnchor;
    let from: number;
    let to: number;
    let isNode = false;

    if (selection instanceof NodeSelection) {
      anchor = { anchorNodeId: ProsemirrorHelper.getNodeHash(selection.node) };
      from = selection.from;
      to = selection.from + selection.node.nodeSize;
      isNode = true;
    } else if (selection instanceof TextSelection && !selection.empty) {
      if (
        isMarkActive(
          state.schema.marks.comment,
          { resolved: false },
          { exact: true }
        )(state)
      ) {
        return false;
      }

      const anchorText = textBetween(doc, selection.from, selection.to);
      if (!anchorText) {
        return false;
      }

      anchor = { anchorText };

      // Short selections are more likely to be ambiguous, so capture a small
      // window of surrounding text to disambiguate.
      if (anchorText.length < unambiguousAnchorLength) {
        anchor.anchorPrefix = textBetween(
          doc,
          Math.max(0, selection.from - anchorContextLength),
          selection.from
        );
        anchor.anchorSuffix = textBetween(
          doc,
          selection.to,
          Math.min(doc.content.size, selection.to + anchorContextLength)
        );
      }
      from = selection.from;
      to = selection.to;
    } else {
      return false;
    }

    // Commands are also invoked without `dispatch` purely to check whether
    // they are available, so all side effects must be guarded behind it.
    if (dispatch) {
      const id = uuidv4();
      dispatch(
        state.tr.setMeta(draftCommentAnchorPluginKey, {
          add: { id, from, to, isNode, userId: options.userId },
        })
      );
      if (options.userId) {
        options.onCreate?.(id, options.userId, { focus: true, anchor });
      }
      options.onOpenCommentsSidebar?.();
    }
    return true;
  };

const addCommentNodeSelection =
  (attrs: Attrs): Command =>
  (state, dispatch) => {
    if (!(state.selection instanceof NodeSelection)) {
      return false;
    }
    const { selection } = state;
    const existingMarks = selection.node.attrs.marks ?? [];
    const newMark = {
      type: "comment",
      attrs: {
        id: uuidv4(),
        userId: attrs.userId,
        draft: true,
      },
    };
    const newAttrs = {
      ...selection.node.attrs,
      marks: [...existingMarks, newMark],
    };
    dispatch?.(state.tr.setNodeMarkup(selection.from, undefined, newAttrs));
    return true;
  };

const addCommentTextSelection =
  (attrs: Attrs): Command =>
  (state, dispatch) => {
    if (!(state.selection instanceof TextSelection)) {
      return false;
    }
    if (state.selection.empty) {
      return false;
    }

    if (
      isMarkActive(
        state.schema.marks.comment,
        {
          resolved: false,
        },
        { exact: true }
      )(state)
    ) {
      return false;
    }

    chainTransactions(
      addMark(state.schema.marks.comment, {
        id: uuidv4(),
        userId: attrs.userId,
        draft: true,
      }),
      collapseSelection()
    )(state, dispatch);

    return true;
  };
