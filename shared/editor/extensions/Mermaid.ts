import last from "lodash/last";
import sortBy from "lodash/sortBy";
import { v4 as uuidv4 } from "uuid";
import type MermaidUnsafe from "mermaid";
import type { Node } from "prosemirror-model";
import type { Transaction } from "prosemirror-state";
import { NodeSelection, Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { toast } from "sonner";
import { isCode, isMermaid } from "../lib/isCode";
import { isRemoteTransaction, mapDecorations } from "../lib/multiplayer";
import { findBlockNodes } from "../queries/findChildren";
import { findParentNode } from "../queries/findParentNode";
import type { NodeWithPos } from "../types";
import type { Editor } from "../../../app/editor";
import { LightboxImageFactory } from "../lib/Lightbox";
import { sanitizeUrl } from "../../utils/urls";

export const pluginKey = new PluginKey("mermaid");

export type MermaidState = {
  decorationSet: DecorationSet;
  isDark: boolean;
  editingId?: string;
};

class Cache {
  static get(key: string) {
    return this.data.get(key);
  }

  static set(key: string, value: string) {
    this.data.set(key, value);

    if (this.data.size > this.maxSize) {
      this.data.delete(this.data.keys().next().value);
    }
  }

  private static maxSize = 20;
  private static data: Map<string, string> = new Map();
}

let mermaid: typeof MermaidUnsafe;

class MermaidRenderer {
  readonly diagramId: string;
  readonly element: HTMLElement;
  readonly elementId: string;
  readonly editor: Editor;

  constructor(editor: Editor) {
    this.diagramId = uuidv4();
    this.elementId = `mermaid-diagram-wrapper-${this.diagramId}`;
    this.element =
      document.getElementById(this.elementId) || document.createElement("div");
    this.element.id = this.elementId;
    this.element.classList.add("mermaid-diagram-wrapper");
    this.editor = editor;
  }

  render = async (block: { node: Node; pos: number }, isDark: boolean) => {
    const element = this.element;
    const text = block.node.textContent;

    const cacheKey = `${isDark ? "dark" : "light"}-${text}`;
    const cache = Cache.get(cacheKey);
    if (cache) {
      element.classList.remove("parse-error", "empty");
      element.innerHTML = cache;
      return;
    }

    // Create a temporary element that will render the diagram off-screen. This is necessary
    // as Mermaid will error if the element is not visible or the element is removed while the
    // diagram is being rendered.
    const renderElement = document.createElement("div");
    const tempId =
      "offscreen-mermaid-" + Math.random().toString(36).substr(2, 9);
    renderElement.id = tempId;
    renderElement.style.position = "absolute";
    renderElement.style.left = "-9999px";
    renderElement.style.top = "-9999px";
    document.body.appendChild(renderElement);

    try {
      mermaid ??= (await import("mermaid")).default;
      mermaid.initialize({
        startOnLoad: true,
        suppressErrorRendering: true,
        // TODO: Make dynamic based on the width of the editor or remove in
        // the future if Mermaid is able to handle this automatically.
        gantt: { useWidth: 700 },
        pie: { useWidth: 700 },
        fontFamily: getComputedStyle(this.element).fontFamily || "inherit",
        theme: isDark ? "dark" : "default",
        darkMode: isDark,
      });

      const { svg, bindFunctions } = await mermaid.render(tempId, text);

      // Cache the rendered SVG so we won't need to calculate it again in the same session
      if (text) {
        Cache.set(cacheKey, svg);
      }
      element.classList.remove("parse-error", "empty");
      element.innerHTML = svg;

      // Allow the user to interact with the diagram
      bindFunctions?.(element);
    } catch (error) {
      const isEmpty = block.node.textContent.trim().length === 0;

      if (isEmpty) {
        element.innerText = "Empty diagram";
        element.classList.add("empty");
      } else {
        element.innerText = error;
        element.classList.add("parse-error");
      }
    } finally {
      renderElement.remove();
    }
  };
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
  pluginState,
  editor,
  autoEditEmpty = false,
}: {
  doc: Node;
  pluginState: MermaidState;
  editor: Editor;
  autoEditEmpty?: boolean;
}): MermaidState {
  const decorations: Decoration[] = [];
  let newEditingId: string | undefined;

  // Find all blocks that represent Mermaid diagrams (supports both "mermaid" and "mermaidjs")
  const blocks = findBlockNodes(doc).filter((item) => isMermaid(item.node));

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

    const isNewBlock = !bestDecoration;
    const renderer: MermaidRenderer =
      bestDecoration?.spec?.renderer ?? new MermaidRenderer(editor);

    // Auto-enter edit mode for newly created empty mermaid diagrams
    if (
      autoEditEmpty &&
      isNewBlock &&
      block.node.textContent.trim().length === 0
    ) {
      newEditingId = renderer.diagramId;
    }

    const diagramDecoration = Decoration.widget(
      block.pos + block.node.nodeSize,
      () => {
        void renderer.render(block, pluginState.isDark);
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
    ...pluginState,
    ...(newEditingId !== undefined ? { editingId: newEditingId } : {}),
    decorationSet: DecorationSet.create(doc, decorations),
  };
}

export default function Mermaid({
  isDark,
  editor,
}: {
  isDark: boolean;
  editor: Editor;
}) {
  const { onClickLink, dictionary } = editor.props;

  return new Plugin({
    key: pluginKey,
    state: {
      init: (_, { doc }) => {
        const pluginState: MermaidState = {
          decorationSet: DecorationSet.create(doc, []),
          isDark,
        };
        return getNewState({
          doc,
          pluginState,
          editor,
        });
      },
      apply: (
        transaction: Transaction,
        pluginState: MermaidState,
        oldState,
        state
      ) => {
        const themeMeta = transaction.getMeta("theme");
        const mermaidMeta = transaction.getMeta(pluginKey);
        const themeToggled = themeMeta?.isDark !== undefined;

        const nextPluginState = {
          ...pluginState,
          isDark: themeToggled ? themeMeta.isDark : pluginState.isDark,
          editingId:
            mermaidMeta && "editingId" in mermaidMeta
              ? mermaidMeta.editingId
              : pluginState.editingId,
          decorationSet: mapDecorations(pluginState.decorationSet, transaction),
        };

        if (
          transaction.selectionSet &&
          nextPluginState.editingId &&
          !mermaidMeta
        ) {
          const codeBlock = findParentNode(isCode)(state.selection);
          let isEditing = codeBlock && isMermaid(codeBlock.node);

          if (isEditing && codeBlock && !transaction.docChanged) {
            const decorations = nextPluginState.decorationSet.find(
              codeBlock.pos,
              codeBlock.pos + codeBlock.node.nodeSize
            );
            const nodeDecoration = decorations.find(
              (d) => d.spec.diagramId && d.from === codeBlock.pos
            );
            if (nodeDecoration?.spec.diagramId !== nextPluginState.editingId) {
              isEditing = false;
            }
          }

          if (!isEditing) {
            nextPluginState.editingId = undefined;
          }
        }

        const node = state.selection.$head.parent;
        const previousNode = oldState.selection.$head.parent;
        const codeBlockChanged =
          transaction.docChanged &&
          (isMermaid(node) || isMermaid(previousNode));

        // @ts-expect-error accessing private field.
        const isPaste = transaction.meta?.paste;

        if (
          isPaste ||
          mermaidMeta ||
          themeToggled ||
          codeBlockChanged ||
          isRemoteTransaction(transaction)
        ) {
          return getNewState({
            doc: transaction.doc,
            pluginState: nextPluginState,
            editor,
            autoEditEmpty:
              codeBlockChanged &&
              transaction.docChanged &&
              !isPaste &&
              !isRemoteTransaction(transaction),
          });
        }

        return nextPluginState;
      },
    },
    appendTransaction(_transactions, _oldState, newState) {
      const { selection } = newState;
      if (selection instanceof NodeSelection) {
        return null;
      }

      const codeBlock = findParentNode(isCode)(selection);
      if (!codeBlock || !isMermaid(codeBlock.node)) {
        return null;
      }

      const mermaidState = pluginKey.getState(newState) as MermaidState;
      const decorations = mermaidState?.decorationSet.find(
        codeBlock.pos,
        codeBlock.pos + codeBlock.node.nodeSize
      );
      const nodeDecoration = decorations?.find(
        (d) => d.spec.diagramId && d.from === codeBlock.pos
      );

      if (
        nodeDecoration?.spec.diagramId &&
        mermaidState?.editingId === nodeDecoration.spec.diagramId
      ) {
        return null;
      }

      return newState.tr.setSelection(
        NodeSelection.create(newState.doc, codeBlock.pos)
      );
    },
    view: (view) => {
      view.dispatch(view.state.tr.setMeta(pluginKey, { loaded: true }));
      return {};
    },
    props: {
      decorations(state) {
        return this.getState(state)?.decorationSet;
      },
      handleDOMEvents: {
        click(_view, event: MouseEvent) {
          const target = event.target as HTMLElement;
          const anchor = target?.closest("a");

          if (anchor instanceof SVGAElement) {
            event.stopPropagation();
            event.preventDefault();
            return false;
          }

          return true;
        },
        mousedown(view, event) {
          const target = event.target as HTMLElement;
          const diagram = target?.closest(".mermaid-diagram-wrapper");
          if (!diagram) {
            return false;
          }

          const codeBlock = diagram.previousElementSibling;
          if (!codeBlock) {
            return false;
          }

          const pos = view.posAtDOM(codeBlock, 0);
          const $pos = view.state.doc.resolve(pos);
          const nodePos = $pos.before();
          const node = view.state.doc.nodeAt(nodePos);

          const isSelected =
            view.state.selection instanceof NodeSelection &&
            view.state.selection.from === nodePos;

          event.preventDefault();

          if (isSelected || editor.props.readOnly) {
            // Already selected or read-only, open lightbox
            if (node && node.textContent.trim().length > 0) {
              editor.updateActiveLightboxImage(
                LightboxImageFactory.createLightboxImage(view, nodePos)
              );
            }
          } else {
            // First click, select the node
            view.dispatch(
              view.state.tr
                .setSelection(NodeSelection.create(view.state.doc, nodePos))
                .scrollIntoView()
            );
          }
          return true;
        },
        mouseup(view, event) {
          const target = event.target as HTMLElement;
          const diagram = target?.closest(".mermaid-diagram-wrapper");
          if (!diagram) {
            return false;
          }

          const anchor = target?.closest("a");
          if (anchor instanceof SVGAElement) {
            const href = anchor.getAttribute("xlink:href");

            try {
              if (onClickLink && href) {
                event.stopPropagation();
                event.preventDefault();
                onClickLink(sanitizeUrl(href) ?? "");
              }
            } catch (_err) {
              toast.error(dictionary.openLinkError);
            }
          }

          return false;
        },
      },
    },
  });
}
