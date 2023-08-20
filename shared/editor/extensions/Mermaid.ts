import { Node } from "prosemirror-model";
import {
  Plugin,
  PluginKey,
  TextSelection,
  Transaction,
} from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { v4 as uuidv4 } from "uuid";
import { isCode } from "../lib/isCode";
import { findBlockNodes } from "../queries/findChildren";

type MermaidState = {
  decorationSet: DecorationSet;
  isDark: boolean;
};

function getNewState({
  doc,
  name,
  pluginState,
}: {
  doc: Node;
  name: string;
  pluginState: MermaidState;
}) {
  const decorations: Decoration[] = [];

  // Find all blocks that represent Mermaid diagrams
  const blocks: { node: Node; pos: number }[] = findBlockNodes(doc).filter(
    (item) =>
      item.node.type.name === name && item.node.attrs.language === "mermaidjs"
  );

  blocks.forEach((block) => {
    const existingDecorations = pluginState.decorationSet.find(
      block.pos,
      block.pos + block.node.nodeSize
    );

    // Attempt to find the existing diagramId from the decoration, or assign
    // a new one if none exists yet.
    const diagramId = existingDecorations[0]?.spec["diagramId"] ?? uuidv4();

    const diagramDecoration = Decoration.widget(
      block.pos + block.node.nodeSize,
      () => {
        const elementId = "mermaid-diagram-wrapper-" + diagramId;
        const element =
          document.getElementById(elementId) || document.createElement("div");
        element.id = elementId;
        element.classList.add("mermaid-diagram-wrapper");

        void import("mermaid").then((module) => {
          module.default.initialize({
            startOnLoad: true,
            // TODO: Make dynamic based on the width of the editor or remove in
            // the future if Mermaid is able to handle this automatically.
            gantt: {
              useWidth: 700,
            },
            theme: pluginState.isDark ? "dark" : "default",
            fontFamily: "inherit",
          });
          try {
            module.default.render(
              "mermaid-diagram-" + diagramId,
              block.node.textContent,
              (svgCode) => {
                element.classList.remove("parse-error", "empty");
                element.innerHTML = svgCode;
              }
            );
          } catch (error) {
            const isEmpty = block.node.textContent.trim().length === 0;

            if (isEmpty) {
              element.innerText = "Empty diagram";
              element.classList.add("empty");
            } else {
              element.innerText = "Error rendering diagram";
              element.classList.add("parse-error");
            }
          }
        });

        return element;
      },
      {
        diagramId,
      }
    );

    const diagramIdDecoration = Decoration.node(
      block.pos,
      block.pos + block.node.nodeSize,
      {},
      {
        diagramId,
      }
    );

    decorations.push(diagramDecoration);
    decorations.push(diagramIdDecoration);
  });

  return {
    decorationSet: DecorationSet.create(doc, decorations),
    isDark: pluginState.isDark,
  };
}

export default function Mermaid({
  name,
  isDark,
}: {
  name: string;
  isDark: boolean;
}) {
  return new Plugin({
    key: new PluginKey("mermaid"),
    state: {
      init: (_, { doc }) => {
        const pluginState: MermaidState = {
          decorationSet: DecorationSet.create(doc, []),
          isDark,
        };
        return pluginState;
      },
      apply: (
        transaction: Transaction,
        pluginState: MermaidState,
        oldState,
        state
      ) => {
        const nodeName = state.selection.$head.parent.type.name;
        const previousNodeName = oldState.selection.$head.parent.type.name;
        const codeBlockChanged =
          transaction.docChanged && [nodeName, previousNodeName].includes(name);
        const ySyncEdit = !!transaction.getMeta("y-sync$");
        const themeMeta = transaction.getMeta("theme");
        const mermaidMeta = transaction.getMeta("mermaid");
        const themeToggled = themeMeta?.isDark !== undefined;

        if (themeToggled) {
          pluginState.isDark = themeMeta.isDark;
        }

        if (mermaidMeta || themeToggled || codeBlockChanged || ySyncEdit) {
          return getNewState({
            doc: transaction.doc,
            name,
            pluginState,
          });
        }

        return {
          decorationSet: pluginState.decorationSet.map(
            transaction.mapping,
            transaction.doc
          ),
          isDark: pluginState.isDark,
        };
      },
    },
    view: (view) => {
      view.dispatch(view.state.tr.setMeta("mermaid", { loaded: true }));
      return {};
    },
    props: {
      decorations(state) {
        return this.getState(state)?.decorationSet;
      },
      handleDOMEvents: {
        mousedown(view, event) {
          const target = event.target as HTMLElement;
          const diagram = target?.closest(".mermaid-diagram-wrapper");
          const codeBlock = diagram?.previousElementSibling;

          if (!codeBlock) {
            return false;
          }

          const pos = view.posAtDOM(codeBlock, 0);
          if (!pos) {
            return false;
          }

          // select node
          if (diagram && event.detail === 1) {
            view.dispatch(
              view.state.tr
                .setSelection(TextSelection.near(view.state.doc.resolve(pos)))
                .scrollIntoView()
            );
            return true;
          }

          return false;
        },
        keydown: (view, event) => {
          switch (event.key) {
            case "ArrowDown": {
              const { selection } = view.state;
              const $pos = view.state.doc.resolve(selection.from + 1);
              const nextBlock = $pos.nodeAfter;

              if (
                nextBlock &&
                isCode(nextBlock) &&
                nextBlock.attrs.language === "mermaidjs"
              ) {
                view.dispatch(
                  view.state.tr
                    .setSelection(
                      TextSelection.near(
                        view.state.doc.resolve(selection.to + 1)
                      )
                    )
                    .scrollIntoView()
                );
                event.preventDefault();
                return true;
              }
              return false;
            }
            case "ArrowUp": {
              const { selection } = view.state;
              const $pos = view.state.doc.resolve(selection.from - 1);
              const prevBlock = $pos.nodeBefore;

              if (
                prevBlock &&
                isCode(prevBlock) &&
                prevBlock.attrs.language === "mermaidjs"
              ) {
                view.dispatch(
                  view.state.tr
                    .setSelection(
                      TextSelection.near(
                        view.state.doc.resolve(selection.from - 2)
                      )
                    )
                    .scrollIntoView()
                );
                event.preventDefault();
                return true;
              }
              return false;
            }
          }

          return false;
        },
      },
    },
  });
}
