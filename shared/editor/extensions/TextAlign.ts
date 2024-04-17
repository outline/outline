import { Schema } from "prosemirror-model";

import { NodesWithTextDirAlignSupport } from "../../constants";
import { TextAlign as TextAlignType } from "../../types";

import { setAttrOnSelection } from "../commands/setAttrOnSelection";
import Extension from "../lib/Extension";

/**
 * An editor extension that adds commands to change alignment of nodes
 */
export default class TextAlign extends Extension {
  get name() {
    return "alignment";
  }

  commands(_options: { schema: Schema }) {
    return {
      align_left: () =>
        setAttrOnSelection({
          attrKey: "textAlign",
          attr: TextAlignType.Left,
          allowedNodeTypes: NodesWithTextDirAlignSupport,
        }),
      align_center: () =>
        setAttrOnSelection({
          attrKey: "textAlign",
          attr: TextAlignType.Center,
          allowedNodeTypes: NodesWithTextDirAlignSupport,
        }),
      align_right: () =>
        setAttrOnSelection({
          attrKey: "textAlign",
          attr: TextAlignType.Right,
          allowedNodeTypes: NodesWithTextDirAlignSupport,
        }),
    };
  }
}
