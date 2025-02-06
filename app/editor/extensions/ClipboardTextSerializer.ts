import { Plugin, PluginKey } from "prosemirror-state";
import Extension from "@shared/editor/lib/Extension";

/**
 * A plugin that allows overriding the default behavior of the editor to allow
 * copying text including the markdown formatting.
 */
export default class ClipboardTextSerializer extends Extension {
  get name() {
    return "clipboardTextSerializer";
  }

  get plugins() {
    const serializer = this.editor.extensions.serializer();

    return [
      new Plugin({
        key: new PluginKey("clipboardTextSerializer"),
        props: {
          clipboardTextSerializer: (slice) =>
            serializer.serialize(slice.content, {
              softBreak: true,
            }),
        },
      }),
    ];
  }
}
