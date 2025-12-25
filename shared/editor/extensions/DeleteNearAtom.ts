import type { Command } from "prosemirror-state";
import { TextSelection } from "prosemirror-state";
import Extension from "../lib/Extension";

/**
 * GitHub Issue: https://github.com/outline/outline/issues/10681
 */
export default class DeleteNearAtom extends Extension {
  get name() {
    return "deleteNearAtom";
  }

  keys(): Record<string, Command> {
    return {
      Delete: deleteForwardNearAtom(),
      Backspace: deleteBackwardNearAtom(),
    };
  }
}

function deleteForwardNearAtom(): Command {
  return (state, dispatch) => {
    const { selection } = state;
    if (!(selection instanceof TextSelection)) {
      return false;
    }

    const { $cursor } = selection;
    if (!$cursor) {
      return false;
    }
    if ($cursor.textOffset !== 0) {
      return false;
    }

    const nodeAfter = $cursor.nodeAfter;
    if (!nodeAfter?.isText || nodeAfter.nodeSize !== 1) {
      return false;
    }

    const textEndPos = $cursor.pos + nodeAfter.nodeSize;
    if (textEndPos >= $cursor.end()) {
      return false;
    }

    const $afterText = state.doc.resolve(textEndPos);
    const nodeAfterText = $afterText.nodeAfter;

    if (nodeAfterText?.isAtom && nodeAfterText.isInline) {
      if (dispatch) {
        dispatch(
          state.tr.delete($cursor.pos, $cursor.pos + 1).scrollIntoView()
        );
      }
      return true;
    }

    return false;
  };
}

function deleteBackwardNearAtom(): Command {
  return (state, dispatch) => {
    const { selection } = state;
    if (!(selection instanceof TextSelection)) {
      return false;
    }

    const { $cursor } = selection;
    if (!$cursor) {
      return false;
    }

    const nodeBefore = $cursor.nodeBefore;
    const nodeAfter = $cursor.nodeAfter;
    if (!nodeBefore?.isText || nodeBefore.nodeSize !== 1) {
      return false;
    }

    if (nodeAfter?.isAtom && nodeAfter.isInline) {
      if (dispatch) {
        dispatch(
          state.tr.delete($cursor.pos - 1, $cursor.pos).scrollIntoView()
        );
      }
      return true;
    }

    return false;
  };
}
