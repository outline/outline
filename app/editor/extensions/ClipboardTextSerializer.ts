import { Plugin, PluginKey } from "prosemirror-state";
import Extension from "@shared/editor/lib/Extension";
import { ProsemirrorHelper } from "@shared/utils/ProsemirrorHelper";

/**
 * A plugin that allows overriding the default behavior of the editor to allow
 * copying text including the markdown formatting.
 */
export default class ClipboardTextSerializer extends Extension {
  get name() {
    return "clipboardTextSerializer";
  }

  get plugins() {
    const mdSerializer = this.editor.extensions.serializer();

    return [
      new Plugin({
        key: new PluginKey("clipboardTextSerializer"),
        props: {
          clipboardTextSerializer: (slice) => {
            const isMultiline = slice.content.childCount > 1;

            // This is a cheap way to determine if the content is "complex",
            // aka it has multiple marks or formatting. In which case we'll use
            // markdown formatting
            const copyAsMarkdown =
              isMultiline ||
              slice.content.content.some(
                (node) => node.content.content.length > 1
              );

            return copyAsMarkdown
              ? mdSerializer.serialize(slice.content, {
                  softBreak: true,
                })
              : slice.content.content
                  .map((node) =>
                    ProsemirrorHelper.toPlainText(node, this.editor.schema)
                  )
                  .join("");
          },
        },
      }),
    ];
  }
}
