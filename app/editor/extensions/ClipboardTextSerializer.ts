import { Plugin, PluginKey } from "prosemirror-state";
import Extension from "@shared/editor/lib/Extension";
import { ProsemirrorHelper } from "@shared/utils/ProsemirrorHelper";
import { isList } from "@shared/editor/queries/isList";

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
            // Check if the only node is a code block
            const isSingleCodeBlock =
              slice.content.childCount === 1 &&
              (slice.content.firstChild?.type.name === "code_block" ||
                slice.content.firstChild?.type.name === "code_fence");

            // Check if the only mark is a code mark
            const marks = new Set<string>();
            slice.content.descendants((node) => {
              node.marks.forEach((mark) => marks.add(mark.type.name));
            });
            const hasOnlyCodeMark =
              marks.size === 1 && marks.has("code_inline");

            const hasMultipleListItems = slice.content.content
              .filter((node) => node.content.content.length > 1)
              .some((node) => isList(node, view.state.schema));
            const hasSingleBlockType =
              [
                ...new Set(
                  slice.content.content
                    .filter((node) => node.content.content.length > 1)
                    .map((node) => node.type.name)
                ),
              ].length <= 1;

            // Use plain text serializer only for "simple" content
            const usePlainText =
              isSingleCodeBlock ||
              hasOnlyCodeMark ||
              (hasSingleBlockType && !hasMultipleListItems);

            return usePlainText
              ? slice.content.content
                  .map((node) => ProsemirrorHelper.toPlainText(node))
                  .join("\n")
              : mdSerializer.serialize(slice.content, {
                  softBreak: true,
                });
          },
        },
      }),
    ];
  }
}
