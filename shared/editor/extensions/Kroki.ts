import debounce from "lodash/debounce";
import last from "lodash/last";
import sortBy from "lodash/sortBy";
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
import { isRemoteTransaction } from "../lib/multiplayer";
import { findBlockNodes, NodeWithPos } from "../queries/findChildren";

type KrokiState = {
  decorationSet: DecorationSet;
  url: string;
};

type RendererFunc = (
  block: { node: Node; pos: number },
  diagram: string
) => void;

class KrokiRenderer {
  readonly diagramId: string;
  readonly element: HTMLElement;
  readonly elementId: string;
  readonly url: string;

  constructor(url: string) {
    this.diagramId = uuidv4();
    this.elementId = `kroki-diagram-wrapper-${this.diagramId}`;
    this.element =
      document.getElementById(this.elementId) || document.createElement("div");
    this.element.id = this.elementId;
    this.element.classList.add("kroki-diagram-wrapper");
    this.url = url;
  }

  renderImmediately = async (
    block: { node: Node; pos: number },
    diagram: string
  ) => {
    const element = this.element;
    const text = block.node.textContent;

    try {
      const isEmpty = block.node.textContent.trim().length === 0;
      if (isEmpty) {
        element.innerText = "Empty diagram";
        element.classList.add("empty");
        return;
      }

      const { default: pako } = await import("pako");
      const data = new TextEncoder().encode(text);
      const compressed = pako.deflate(data, { level: 9, to: "string" });
      const result = btoa(String.fromCharCode.apply(null, compressed))
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
      const response = await fetch(`${this.url}/${diagram}/svg/${result}`);
      const body = await response.text();
      if (response.ok) {
        element.innerHTML = body;
      } else {
        element.innerText = body;
        element.classList.add("parse-error");
      }
    } catch (error) {
      element.innerText = error;
      element.classList.add("parse-error");
    }
  };

  get render(): RendererFunc {
    if (this._rendererFunc) {
      return this._rendererFunc;
    }
    this._rendererFunc = debounce<RendererFunc>(this.renderImmediately, 500);
    return this.renderImmediately;
  }

  private _rendererFunc?: RendererFunc;
}

function overlap(
  start1: number,
  end1: number,
  start2: number,
  end2: number
): number {
  return Math.max(0, Math.min(end1, end2) - Math.max(start1, start2));
}
/*
  This code find the decoration that overlap the most with a given node.
  This will ensure we can find the best decoration that match the last change set
  See: https://github.com/outline/outline/pull/5852/files#r1334929120
*/
function findBestOverlapDecoration(
  decorations: Decoration[],
  block: NodeWithPos
): Decoration | undefined {
  if (decorations.length === 0) {
    return undefined;
  }
  return last(
    sortBy(decorations, (decoration) =>
      overlap(
        decoration.from,
        decoration.to,
        block.pos,
        block.pos + block.node.nodeSize
      )
    )
  );
}

function getNewState({
  doc,
  name,
  pluginState,
}: {
  doc: Node;
  name: string;
  pluginState: KrokiState;
}): KrokiState {
  const decorations: Decoration[] = [];

  // Find all blocks that represent Kroki diagrams
  const blocks = findBlockNodes(doc).filter(
    (item) =>
      item.node.type.name === name && item.node.attrs.language === "kroki"
  );

  blocks.forEach((block) => {
    const existingDecorations = pluginState.decorationSet.find(
      block.pos,
      block.pos + block.node.nodeSize,
      (spec) => !!spec.diagramId
    );

    const bestDecoration = findBestOverlapDecoration(
      existingDecorations,
      block
    );

    const renderer: KrokiRenderer =
      bestDecoration?.spec?.renderer ?? new KrokiRenderer(pluginState.url);

    const diagramDecoration = Decoration.widget(
      block.pos + block.node.nodeSize,
      () => {
        void renderer.render(block, block.node.attrs.diagram);
        return renderer.element;
      },
      {
        diagramId: renderer.diagramId,
        renderer,
        side: -10,
      }
    );

    const diagramIdDecoration = Decoration.node(
      block.pos,
      block.pos + block.node.nodeSize,
      {},
      {
        diagramId: renderer.diagramId,
        renderer,
      }
    );

    decorations.push(diagramDecoration);
    decorations.push(diagramIdDecoration);
  });

  return {
    decorationSet: DecorationSet.create(doc, decorations),
    url: pluginState.url,
  };
}

export default function Kroki({ name, url }: { name: string; url: string }) {
  return new Plugin({
    key: new PluginKey("kroki"),
    state: {
      init: (_, { doc }) => {
        const pluginState: KrokiState = {
          decorationSet: DecorationSet.create(doc, []),
          url,
        };
        return getNewState({
          doc,
          name,
          pluginState,
        });
      },
      apply: (
        transaction: Transaction,
        pluginState: KrokiState,
        oldState,
        state
      ) => {
        const nodeName = state.selection.$head.parent.type.name;
        const previousNodeName = oldState.selection.$head.parent.type.name;
        const codeBlockChanged =
          transaction.docChanged && [nodeName, previousNodeName].includes(name);
        const krokiMeta = transaction.getMeta("kroki");

        if (krokiMeta || codeBlockChanged || isRemoteTransaction(transaction)) {
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
          url: pluginState.url,
        };
      },
    },
    view: (view) => {
      view.dispatch(view.state.tr.setMeta("kroki", { loaded: true }));
      return {};
    },
    props: {
      decorations(state) {
        return this.getState(state)?.decorationSet;
      },
      handleDOMEvents: {
        mousedown(view, event) {
          const target = event.target as HTMLElement;
          const diagram = target?.closest(".kroki-diagram-wrapper");
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
              const $pos = view.state.doc.resolve(
                Math.min(selection.from + 1, view.state.doc.nodeSize)
              );
              const nextBlock = $pos.nodeAfter;

              if (
                nextBlock &&
                isCode(nextBlock) &&
                nextBlock.attrs.language === "kroki"
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
              const $pos = view.state.doc.resolve(
                Math.max(0, selection.from - 1)
              );
              const prevBlock = $pos.nodeBefore;

              if (
                prevBlock &&
                isCode(prevBlock) &&
                prevBlock.attrs.language === "kroki"
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
