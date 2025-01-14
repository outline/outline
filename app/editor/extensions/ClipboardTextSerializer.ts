import { Plugin, PluginKey } from "prosemirror-state";
import Extension from "@shared/editor/lib/Extension";
import textBetween from "@shared/editor/lib/textBetween";
import { getTextSerializers } from "@shared/editor/lib/textSerializers";

/**
 * A plugin that allows overriding the default behavior of the editor to allow
 * copying text for nodes that do not inherently have text children by defining
 * a `toPlainText` method in the node spec.
 */
export default class ClipboardTextSerializer extends Extension {
  get name() {
    return "clipboardTextSerializer";
  }

  get plugins() {
    const textSerializers = getTextSerializers(this.editor.schema);

    return [
      new Plugin({
        key: new PluginKey("clipboardTextSerializer"),
        props: {
          clipboardTextSerializer: () => {
            const { doc, selection } = this.editor.view.state;
            const { ranges } = selection;
            const from = Math.min(...ranges.map((range) => range.$from.pos));
            const to = Math.max(...ranges.map((range) => range.$to.pos));

            return textBetween(doc, from, to, textSerializers);
          },
        },
      }),
    ];
  }
}
