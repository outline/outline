import { NodeType } from "prosemirror-model";
import { EditorState, TextSelection } from "prosemirror-state";
import { findBlockNodes } from "prosemirror-utils";
import findCollapsedNodes from "../queries/findCollapsedNodes";
import { Dispatch } from "../types";

export default function splitHeading(type: NodeType) {
  return (state: EditorState, dispatch: Dispatch): boolean => {
    const { $from, from, $to, to } = state.selection;

    // check we're in a matching heading node
    if ($from.parent.type !== type) {
      return false;
    }

    // is the selection at the beginning of the node
    const startPos = $from.before() + 1;
    if (startPos === from) {
      const collapsedNodes = findCollapsedNodes(state.doc);
      const allBlocks = findBlockNodes(state.doc);
      const previousBlock = allBlocks
        .filter((a) => a.pos + a.node.nodeSize < startPos)
        .pop();
      const previousBlockIsCollapsed = !!collapsedNodes.find(
        (a) => a.pos === previousBlock?.pos
      );

      if (previousBlockIsCollapsed) {
        // Insert a new heading directly before this one
        const transaction = state.tr.insert(
          $from.before(),
          type.create({ ...$from.parent.attrs, collapsed: false })
        );

        // Move the selection into the new heading node and make sure it's on screen
        dispatch(
          transaction
            .setSelection(
              TextSelection.near(transaction.doc.resolve($from.before()))
            )
            .scrollIntoView()
        );

        return true;
      }

      return false;
    }

    // If the heading isn't collapsed standard behavior applies
    if (!$from.parent.attrs.collapsed) {
      return false;
    }

    // is the selection at the end of the node. If not standard node-splitting
    // behavior applies
    const endPos = $to.after() - 1;
    if (endPos === to) {
      // Find the next visible block after this one. It takes into account nested
      // collapsed headings and reaching the end of the document
      const collapsedNodes = findCollapsedNodes(state.doc);
      const allBlocks = findBlockNodes(state.doc);
      const visibleBlocks = allBlocks.filter(
        (a) => !collapsedNodes.find((b) => b.pos === a.pos)
      );
      const nextVisibleBlock = visibleBlocks.find((a) => a.pos > from);
      const pos = nextVisibleBlock
        ? nextVisibleBlock.pos
        : state.doc.content.size;

      // Insert a new heading directly before the next visible block
      const transaction = state.tr.insert(
        pos,
        type.create({ ...$from.parent.attrs, collapsed: false })
      );

      // Move the selection into the new heading node and make sure it's on screen
      dispatch(
        transaction
          .setSelection(
            TextSelection.near(
              transaction.doc.resolve(
                Math.min(pos + 1, transaction.doc.content.size)
              )
            )
          )
          .scrollIntoView()
      );

      return true;
    }

    return false;
  };
}
