import type { Command } from "prosemirror-state";
import { NodeSelection, TextSelection } from "prosemirror-state";
import { v4 as uuidv4 } from "uuid";
import { isMarkActive } from "../queries/isMarkActive";
import { chainTransactions } from "../lib/chainTransactions";
import { addMark } from "./addMark";
import { collapseSelection } from "./collapseSelection";
import { chainCommands } from "prosemirror-commands";

interface CommentAttrs {
  userId: string;
  onCreateCommentMark?: (commentId: string, userId: string) => void;
}

export const addComment = (attrs: CommentAttrs): Command =>
  chainCommands(addCommentTextSelection(attrs), addCommentNodeSelection(attrs));

const addCommentNodeSelection =
  (attrs: CommentAttrs): Command =>
  (state, dispatch) => {
    if (!(state.selection instanceof NodeSelection)) {
      return false;
    }
    const { selection } = state;
    const existingMarks = selection.node.attrs.marks ?? [];
    const id = uuidv4();
    const newMark = {
      type: "comment",
      attrs: {
        id,
        userId: attrs.userId,
        draft: true,
      },
    };
    const newAttrs = {
      ...selection.node.attrs,
      marks: [...existingMarks, newMark],
    };

    attrs.onCreateCommentMark?.(id, attrs.userId);
    dispatch?.(state.tr.setNodeMarkup(selection.from, undefined, newAttrs));
    return true;
  };

const addCommentTextSelection =
  (attrs: CommentAttrs): Command =>
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

    const id = uuidv4();

    attrs.onCreateCommentMark?.(id, attrs.userId);

    chainTransactions(
      addMark(state.schema.marks.comment, {
        id,
        userId: attrs.userId,
        draft: true,
      }),
      collapseSelection()
    )(state, dispatch);

    return true;
  };
