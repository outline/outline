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
import { findBlockNodes, NodeWithPos } from "../queries/findChildren";

type MermaidState = {
  decorationSet: DecorationSet;
  isDark: boolean;
  initialized: boolean;
};

type RendererFunc = (block: { node: Node; pos: number }) => void;

class MermaidRenderer {
  readonly diagramId: string;
  readonly element: HTMLElement;
  readonly elementId: string;
  private currentTextContent = "";
  private _rendererFunc?: RendererFunc;

  constructor() {
    this.diagramId = uuidv4();
    this.elementId = "mermaid-diagram-wrapper-" + this.diagramId;
    this.element =
      document.getElementById(this.elementId) || document.createElement("div");
    this.element.id = this.elementId;
    this.element.classList.add("mermaid-diagram-wrapper");
  }

  async renderImmediately(block: { node: Node; pos: number }) {
    const diagramId = this.diagramId;
    const element = this.element;
    const newTextContent = block.node.textContent;
    if (newTextContent === this.currentTextContent) {
      return;
    }
    try {
      const { default: mermaid } = await import("mermaid");
      void mermaid.render(
        "mermaid-diagram-" + diagramId,
        newTextContent,
        (svgCode, bindFunctions) => {
          this.currentTextContent = newTextContent;
          element.classList.remove("parse-error", "empty");
          element.innerHTML = svgCode;
          bindFunctions?.(element);
        },
        element
      );
    } catch (error) {
      const isEmpty = block.node.textContent.trim().length === 0;

      if (isEmpty) {
        element.innerText = "Empty diagram";
        element.classList.add("empty");
      } else {
        element.innerText = `Error rendering diagram\n\n${error}`;
        element.classList.add("parse-error");
      }
    }
  }

  get render(): RendererFunc {
    if (this._rendererFunc) {
      return this._rendererFunc;
    }
    this._rendererFunc = debounce<RendererFunc>(this.renderImmediately, 500);
    return this._rendererFunc;
  }
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
  pluginState: MermaidState;
}): MermaidState {
  const decorations: Decoration[] = [];

  // Find all blocks that represent Mermaid diagrams
  const blocks = findBlockNodes(doc).filter(
    (item) =>
      item.node.type.name === name && item.node.attrs.language === "mermaidjs"
  );

  let { initialized } = pluginState;
  if (blocks.length > 0 && !initialized) {
    void import("mermaid").then(({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: true,
        // TODO: Make dynamic based on the width of the editor or remove in
        // the future if Mermaid is able to handle this automatically.
        gantt: {
          useWidth: 700,
        },
        theme: pluginState.isDark ? "dark" : "default",
        fontFamily: "inherit",
      });
    });

    initialized = true;
  }

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

    const renderer: MermaidRenderer =
      bestDecoration?.spec?.renderer ?? new MermaidRenderer();

    const diagramDecoration = Decoration.widget(
      block.pos + block.node.nodeSize,
      () => {
        const element = renderer.element;
        void renderer.render(block);
        return element;
      },
      {
        diagramId: renderer.diagramId,
        renderer,
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
    isDark: pluginState.isDark,
    initialized,
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
          initialized: false,
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
