import { EditorState } from "prosemirror-state";

import { findParentNode } from "./findParentNode";

const isAttrActiveOnSelection =
  ({ attr, attrKey }: { attr: unknown; attrKey: string }) =>
  (state: EditorState) => {
    if (!attr) {
      return false;
    }

    const { $from, empty } = state.selection;
    const parent = findParentNode((node) => !!node.attrs[attrKey])(
      state.selection
    );
    const node = parent?.node;

    if (empty) {
      if (node && node.attrs[attrKey] === attr) {
        return true;
      }

      return false;
    }

    const nodeAfter = $from.nodeAfter;

    if (nodeAfter?.attrs[attrKey] === attr) {
      return true;
    }

    if (node && node.attrs[attrKey] === attr) {
      return true;
    }

    return false;
  };

export default isAttrActiveOnSelection;
