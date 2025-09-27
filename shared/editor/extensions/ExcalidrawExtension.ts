import { Plugin, PluginKey } from "prosemirror-state";
import Extension from "../lib/Extension";
import { findBlockNodes } from "../queries/findChildren";

const EXCALIDRAW_PLUGIN_KEY = new PluginKey("excalidraw");

export default class ExcalidrawExtension extends Extension {
  get name() {
    return "excalidraw";
  }

  get plugins() {
    return [
      new Plugin({
        key: EXCALIDRAW_PLUGIN_KEY,
        appendTransaction: (transactions, oldState, newState) => {
          const docChanged = transactions.some((transaction) => transaction.docChanged);
          if (!docChanged) {
            return null;
          }

          const transform = newState.tr;
          let modified = false;

          // Find all code blocks with language "excalidraw"
          const blocks = findBlockNodes(newState.doc).filter(
            (item) =>
              item.node.type.name === "code_block" ||
              item.node.type.name === "code_fence"
          );

          blocks.forEach((block) => {
            const { node, pos } = block;
            const language = node.attrs.language;

            if (language === "excalidraw") {
              const content = node.textContent;

              try {
                // Try to parse the content as JSON
                const data = JSON.parse(content);

                // Create excalidraw node
                const excalidrawType = newState.schema.nodes.excalidraw;
                if (excalidrawType) {
                  const excalidrawNode = excalidrawType.create({
                    id: data.id || `excalidraw-${Date.now()}`,
                    data,
                    svg: "",
                    alt: data.alt || null,
                  });

                  transform.replaceWith(pos, pos + node.nodeSize, excalidrawNode);
                  modified = true;
                }
              } catch (error) {
                // Invalid JSON, leave as code block
                console.warn("Invalid Excalidraw JSON:", error);
              }
            }
          });

          return modified ? transform : null;
        },
      }),
    ];
  }
}