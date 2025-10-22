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
            

            // Use plain text serializer only for code-only content
            const usePlainText = isSingleCodeBlock || hasOnlyCodeMark;

            return usePlainText
              ? slice.content.content
                  .map((node) => ProsemirrorHelper.toPlainText(node))
                  .join("")
              : mdSerializer.serialize(slice.content, {
                  softBreak: true,
                });
          },
        },
      }),
    ];
  }
}
