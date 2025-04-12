import { Plugin, PluginKey } from "prosemirror-state";
import Extension from "@shared/editor/lib/Extension";
import { isList } from "@shared/editor/queries/isList";
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
          clipboardTextSerializer: (slice, view) => {
            const isMultiline = slice.content.childCount > 1;

            // This is a cheap way to determine if the content is "complex",
            // aka it has multiple marks or formatting. In which case we'll use
            // markdown formatting
            const hasMultipleListItems = slice.content.content
              .filter((node) => node.content.content.length > 1)
              .some((node) => isList(node, view.state.schema));
            const hasMultipleBlockTypes =
              [
                ...new Set(
                  slice.content.content
                    .filter((node) => node.content.content.length > 1)
                    .map((node) => node.type.name)
                ),
              ].length > 1;
            const copyAsMarkdown =
              isMultiline || hasMultipleBlockTypes || hasMultipleListItems;

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
