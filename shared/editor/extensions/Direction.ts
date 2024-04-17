import { Schema } from "prosemirror-model";
import { Command } from "prosemirror-state";

import { NodesWithTextDirAlignSupport } from "../../constants";
import { Direction as DirType, TextAlign as TextAlignType } from "../../types";

import { setAttrOnSelection } from "../commands/setAttrOnSelection";
import Extension from "../lib/Extension";
import chainTransactions from "../lib/chainTransactions";

/**
 * An editor extension that adds commands to change direction of nodes
 */
export default class Direction extends Extension {
  get name() {
    return "direction";
  }

  commands(_options: { schema: Schema }) {
    return {
      right_to_left: (): Command => (state, dispatch) => {
        chainTransactions(
          setAttrOnSelection({
            attrKey: "dir",
            attr: DirType.RTL,
            allowedNodeTypes: NodesWithTextDirAlignSupport,
          }),
          setAttrOnSelection({
            attrKey: "textAlign",
            attr: TextAlignType.Right,
            allowedNodeTypes: NodesWithTextDirAlignSupport,
          })
        )(state, dispatch);

        return true;
      },
      left_to_right: (): Command => (state, dispatch) => {
        chainTransactions(
          setAttrOnSelection({
            attrKey: "dir",
            attr: DirType.LTR,
            allowedNodeTypes: NodesWithTextDirAlignSupport,
          }),
          setAttrOnSelection({
            attrKey: "textAlign",
            attr: TextAlignType.Left,
            allowedNodeTypes: NodesWithTextDirAlignSupport,
          })
        )(state, dispatch);

        return true;
      },
    };
  }
}
