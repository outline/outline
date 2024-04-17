import { Node as ProseMirrorNode } from "prosemirror-model";
import { Command } from "prosemirror-state";

import { findParentNode } from "../queries/findParentNode";

export function setAttrOnSelection({
  attrKey,
  attr,
  allowedNodeTypes,
}: {
  attrKey: string;
  attr: unknown;
  allowedNodeTypes: string[];
}): Command {
  return (state, dispatch) => {
    const { tr } = state;
    const { selection } = tr;
    const { to, from, $from } = selection;

    const nodesProcessed: ProseMirrorNode[] = [];

    if (!dispatch) {
      return true;
    }

    for (let i = from; i <= to; i++) {
      const node = state.doc.nodeAt(i);

      if (!node) {
        continue;
      }

      nodesProcessed.push(node);

      if (allowedNodeTypes.includes(node?.type.name || "")) {
        tr.setNodeAttribute(i, attrKey, attr);
      }
    }

    const parentNodeRes = findParentNode(() => true)(selection);

    if (parentNodeRes !== undefined) {
      const parentNode = state.doc.nodeAt(parentNodeRes?.pos);

      if (allowedNodeTypes.includes(parentNode?.type.name || "")) {
        tr.setNodeAttribute(parentNodeRes?.pos, attrKey, attr);
      }

      if (parentNode) {
        nodesProcessed.push(parentNode);
      }
    }

    const grandParent = $from.node($from.depth - 1);
    const grandParentChildren = [];

    for (let i = 0; i < grandParent?.childCount; i++) {
      grandParentChildren.push(grandParent.child(i));
    }

    const hasAllChildrenProcessed = grandParentChildren.every((child) =>
      nodesProcessed.find((node) => child === node)
    );

    if ($from.depth > 1) {
      const grandParentPos = $from.before($from.depth - 1);
      const nodeIsAllowed = allowedNodeTypes.includes(grandParent.type.name);

      if (hasAllChildrenProcessed && nodeIsAllowed) {
        tr.setNodeAttribute(grandParentPos, attrKey, attr);
      }
    }

    dispatch(tr);
    return true;
  };
}
