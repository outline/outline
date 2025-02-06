import { Plugin, PluginKey } from "prosemirror-state";
import Extension from "@shared/editor/lib/Extension";

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
    return [
      new Plugin({
        key: new PluginKey("clipboardTextSerializer"),
        props: {
          clipboardTextSerializer: (slice) => {
            const serializer = this.editor.extensions.serializer();
            return serializer.serialize(slice.content, {
              softBreak: true,
            });
          },
        },
      }),
    ];
  }
}
