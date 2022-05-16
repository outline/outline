import { Node } from "prosemirror-model";
import { Plugin, PluginKey, Transaction } from "prosemirror-state";
import { findBlockNodes } from "prosemirror-utils";
import { Decoration, DecorationSet } from "prosemirror-view";

const positionDiagramIdMap: Record<number, number> = {};

type MermaidState = {
  lastDiagramIdGenerated: number;
  decorationSet: DecorationSet;
  diagramVisibility: Record<number, boolean>;
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
  const blocks: { node: Node; pos: number }[] = findBlockNodes(doc).filter(
    (item) => item.node.type.name === name
  );

  blocks.forEach((block) => {
    const language = block.node.attrs.language;
    if (!language || language !== "mermaidjs") {
      return;
    }

    let diagramId: number = positionDiagramIdMap[block.pos];
    if (diagramId === undefined) {
      diagramId = pluginState.lastDiagramIdGenerated + 1;
      positionDiagramIdMap[block.pos] = diagramId;
      pluginState.lastDiagramIdGenerated += 1;
    }

    if (pluginState.diagramVisibility[diagramId] === undefined) {
      pluginState.diagramVisibility[diagramId] = true;
    }

    const _diagramDecoration = Decoration.widget(block.pos, () => {
      const diagramWrapper = document.createElement("div");
      diagramWrapper.classList.add("mermaid-diagram-wrapper");

      if (pluginState.diagramVisibility[diagramId] === false) {
        diagramWrapper.classList.add("diagram-hidden");
      }

      import("mermaid").then((module) => {
        module.default.initialize({ startOnLoad: true });
        try {
          module.default.render(
            "mermaid-diagram-" + diagramId,
            block.node.textContent,
            (svgCode) => {
              diagramWrapper.innerHTML = svgCode;
            }
          );
        } catch (error) {
          console.log(error);
          const errorNode = document.getElementById(
            "d" + "mermaid-diagram-" + diagramId
          );
          if (errorNode) {
            diagramWrapper.appendChild(errorNode);
          }
        }
      });

      return diagramWrapper;
    });

    const _diagramIdDecoration = Decoration.node(
      block.pos,
      block.pos + block.node.nodeSize,
      { "data-diagram-id": "" + diagramId }
    );

    decorations.push(_diagramDecoration);
    decorations.push(_diagramIdDecoration);
  });

  return {
    lastDiagramIdGenerated: pluginState.lastDiagramIdGenerated,
    decorationSet: DecorationSet.create(doc, decorations),
    diagramVisibility: pluginState.diagramVisibility,
  };
}

export default function Mermaid({ name }: { name: string }) {
  let diagramShown = false;

  return new Plugin({
    key: new PluginKey("mermaid"),
    state: {
      init: (_: Plugin, { doc }) => {
        const pluginState: MermaidState = {
          lastDiagramIdGenerated: 0,
          decorationSet: DecorationSet.create(doc, []),
          diagramVisibility: {},
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
        const mermaidMeta = transaction.getMeta("mermaid");
        const diagramToggled =
          mermaidMeta !== undefined && mermaidMeta.toggleDiagram !== undefined;

        if (diagramToggled) {
          console.log(
            mermaidMeta,
            pluginState.diagramVisibility,
            positionDiagramIdMap
          );
          pluginState.diagramVisibility[
            mermaidMeta.toggleDiagram
          ] = !pluginState.diagramVisibility[mermaidMeta.toggleDiagram];
        }

        if (!diagramShown || codeBlockChanged || diagramToggled || ySyncEdit) {
          diagramShown = true;
          return getNewState({ doc: transaction.doc, name, pluginState });
        }

        return {
          lastDiagramIdGenerated: pluginState.lastDiagramIdGenerated,
          decorationSet: pluginState.decorationSet.map(
            transaction.mapping,
            transaction.doc
          ),
          diagramVisibility: pluginState.diagramVisibility,
        };
      },
    },
    view: (view) => {
      if (!diagramShown) {
        // we don't draw diagrams on code blocks on the first render as part of mounting
        // as it's expensive (relative to the rest of the document). Instead let
        // it render without a diagram and then trigger a defered render of Mermaid
        // by updating the plugins metadata
        setTimeout(() => {
          view.dispatch(view.state.tr.setMeta("mermaid", { loaded: true }));
        }, 10);
      }
      return {};
    },
    props: {
      decorations(state) {
        return this.getState(state).decorationSet;
      },
    },
  });
}
