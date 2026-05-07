import { last, sortBy } from "es-toolkit/compat";
import { t } from "i18next";
import { v4 as uuidv4 } from "uuid";
import type MermaidUnsafe from "mermaid";
import type { IconPack } from "@fortawesome/fontawesome-common-types";
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
import { hashString } from "../../utils/string";
import { sanitizeUrl } from "../../utils/urls";

export const pluginKey = new PluginKey("mermaid");

export type MermaidState = {
  decorationSet: DecorationSet;
  isDark: boolean;
  editingId?: string;
};

const STORAGE_PREFIX = "mermaid:";
const MAX_STORAGE_ENTRIES = 20;

class Cache {
  /** Get a cached SVG by diagram text and theme. */
  static get(key: string): string | undefined {
    try {
      const hash = hashString(key);
      const value = sessionStorage.getItem(STORAGE_PREFIX + hash);
      if (value) {
        this.touchLru(hash);
        return value;
      }
    } catch {
      // sessionStorage unavailable
    }
    return undefined;
  }

  /** Cache a rendered SVG in sessionStorage. */
  static set(key: string, value: string) {
    try {
      const hash = hashString(key);
      this.touchLru(hash);
      this.pruneStorage();
      sessionStorage.setItem(STORAGE_PREFIX + hash, value);
    } catch {
      // sessionStorage full or unavailable
    }
  }

  /** Move or append a hash to the end (most recent) of the LRU list. */
  private static touchLru(hash: string) {
    const lru = this.getLru();
    const idx = lru.indexOf(hash);
    if (idx !== -1) {
      lru.splice(idx, 1);
    }
    lru.push(hash);
    sessionStorage.setItem(STORAGE_PREFIX + "lru", JSON.stringify(lru));
  }

  /** Evict least-recently-used entries when over the limit. */
  private static pruneStorage() {
    const lru = this.getLru();

    while (lru.length > MAX_STORAGE_ENTRIES) {
      const evict = lru.shift()!;
      sessionStorage.removeItem(STORAGE_PREFIX + evict);
    }

    sessionStorage.setItem(STORAGE_PREFIX + "lru", JSON.stringify(lru));
  }

  /** Read the LRU order list from sessionStorage. */
  private static getLru(): string[] {
    try {
      const raw = sessionStorage.getItem(STORAGE_PREFIX + "lru");
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // corrupted or unavailable
    }
    return [];
  }
}

let mermaid: typeof MermaidUnsafe;

/** Minimal Iconify JSON icon set format required by Mermaid's `registerIconPacks` API. */
interface IconifyIconSet {
  prefix: string;
  icons: Record<string, { body: string; width: number; height: number }>;
}

/**
 * Converts a FontAwesome icon pack to the Iconify JSON format expected by Mermaid's
 * `registerIconPacks` API.
 *
 * @param pack the FontAwesome icon pack to convert.
 * @param prefix the Iconify prefix to use (e.g. "fa-solid" or "fa-brands").
 * @returns an Iconify-compatible JSON icon set.
 */
function fontAwesomeToIconify(pack: IconPack, prefix: string): IconifyIconSet {
  const icons: IconifyIconSet["icons"] = {};

  for (const iconDef of Object.values(pack)) {
    // icon array layout: [width, height, ligatures, unicode, svgPathData]
    if (!iconDef.iconName || !iconDef.icon) {
      continue;
    }
    const [width, height, , , paths] = iconDef.icon;
    const body = Array.isArray(paths)
      ? paths.map((p) => `<path d="${p}"/>`).join("")
      : `<path d="${paths}"/>`;
    icons[iconDef.iconName] = { body, width, height };
  }

  return { prefix, icons };
}

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

    // Create a temporary element for rendering. We use visibility:hidden instead of
    // offscreen positioning so the browser computes correct bounding boxes for SVG
    // elements — offscreen elements can produce incorrect getBBox() results, leading
    // to wrong viewBox dimensions (see mermaid-js/mermaid#6146).
    const renderElement = document.createElement("div");
    const tempId =
      "offscreen-mermaid-" + Math.random().toString(36).substr(2, 9);
    renderElement.id = tempId;
    renderElement.style.position = "fixed";
    renderElement.style.visibility = "hidden";
    renderElement.style.top = "0";
    renderElement.style.left = "0";
    renderElement.style.width = "100%";
    renderElement.style.zIndex = "-1";
    document.body.appendChild(renderElement);

    try {
      if (!mermaid) {
        mermaid = (await import("mermaid")).default;
        mermaid.registerLayoutLoaders([
          {
            name: "elk",
            loader: async () => {
              const { default: elkLayouts } =
                await import("@mermaid-js/layout-elk");
              const elkDef = elkLayouts.find(
                (d: { name: string }) => d.name === "elk"
              );
              if (!elkDef) {
                throw new Error("ELK layout not found");
              }
              return elkDef.loader();
            },
          },
        ]);
        mermaid.registerIconPacks([
          {
            name: "fa-solid",
            loader: async () => {
              const { fas } = await import("@fortawesome/free-solid-svg-icons");
              return fontAwesomeToIconify(fas, "fa-solid");
            },
          },
          {
            name: "fa-brands",
            loader: async () => {
              const { fab } =
                await import("@fortawesome/free-brands-svg-icons");
              return fontAwesomeToIconify(fab, "fa-brands");
            },
          },
        ]);
      }
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
  const { onClickLink } = editor.props;

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
      handleKeyDown(view, event) {
        if (event.key === "Enter" && event.metaKey && !editor.props.readOnly) {
          const { selection } = view.state;
          const isNodeSel = selection instanceof NodeSelection;
          const isMermaidNode =
            isNodeSel && isMermaid((selection as NodeSelection).node);
          if (isNodeSel && isMermaidNode) {
            editor.commands.edit_mermaid();
            return true;
          }
        }

        if (event.key === "Escape") {
          const mermaidState = pluginKey.getState(view.state) as MermaidState;
          const codeBlock = findParentNode(isCode)(view.state.selection);

          if (mermaidState?.editingId) {
            if (codeBlock && isMermaid(codeBlock.node)) {
              editor.commands.edit_mermaid();
              return true;
            }
          }
        }
        return false;
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
              toast.error(t("Sorry, that type of link is not supported"));
            }
          }

          return false;
        },
      },
    },
  });
}
