import { last, sortBy } from "es-toolkit/compat";
import { t } from "i18next";
import type { DiagramType, IconResolver, RenderOptions } from "pele";
import type * as PeleModule from "pele/lazy";
import { v4 as uuidv4 } from "uuid";
import type {
  IconDefinition,
  IconPack,
} from "@fortawesome/fontawesome-common-types";
import type { Node } from "prosemirror-model";
import type { Transaction } from "prosemirror-state";
import { NodeSelection, Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { errToString } from "../../utils/error";
import { isCode, isMermaid } from "../lib/isCode";
import { isRemoteTransaction, mapDecorations } from "../lib/multiplayer";
import { findBlockNodes } from "../queries/findChildren";
import { findParentNode } from "../queries/findParentNode";
import type { NodeWithPos } from "../types";
import type { Editor } from "../../../app/editor";
import { LightboxImageFactory } from "../lib/Lightbox";
import { hashString } from "../../utils/string";
import { LRUCache } from "../../utils/LRUCache";
import { sanitizeUrl } from "../../utils/urls";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";
import { isModKey } from "../../utils/keyboard";

export const pluginKey = new PluginKey("mermaid");

export type MermaidState = {
  decorationSet: DecorationSet;
  editingId?: string;
};

/** Matches a Font Awesome icon reference, such as "fa:fa-car" or "fa-brands:github". */
const fontAwesomeIconRegex =
  /\b(fa[bsr]?|fa-solid|fa-regular|fa-brands):(?:fa-)?([a-z0-9-]+)/;

/** Font Awesome icons keyed by pack and icon name. */
interface FontAwesomeIcons {
  solid: Map<string, IconDefinition>;
  brands: Map<string, IconDefinition>;
}

/** The loaded Font Awesome icons, set once the packs have loaded. */
let fontAwesomeIcons: FontAwesomeIcons | undefined;

let fontAwesomeLoading: Promise<void> | undefined;

/** The loaded Pele module, kept so that later diagrams render synchronously. */
let pele: typeof PeleModule | undefined;

/** Renders in progress, so that editors showing the same diagram share one result. */
const pending = new Map<string, Promise<string>>();

/** Rendered diagrams, so revisited documents show them without a relayout. */
const cache = new LRUCache<string>({
  max: 20,
  namespace: "pele:v1",
  storage: "sessionStorage",
});

/**
 * Indexes a Font Awesome icon pack by icon name.
 *
 * @param pack the icon pack to index.
 * @returns a map of icon name to icon definition.
 */
function indexIconPack(pack: IconPack): Map<string, IconDefinition> {
  const icons = new Map<string, IconDefinition>();
  for (const iconDef of Object.values(pack)) {
    if (iconDef.iconName && iconDef.icon) {
      icons.set(iconDef.iconName, iconDef);
    }
  }
  return icons;
}

/**
 * Loads the Font Awesome icon packs, once.
 *
 * @returns a promise that resolves when the icons are loaded.
 */
function loadFontAwesomeIcons(): Promise<void> {
  fontAwesomeLoading ??= Promise.all([
    import("@fortawesome/free-solid-svg-icons"),
    import("@fortawesome/free-brands-svg-icons"),
  ]).then(
    ([{ fas }, { fab }]) => {
      fontAwesomeIcons = {
        solid: indexIconPack(fas),
        brands: indexIconPack(fab),
      };
    },
    (error) => {
      fontAwesomeLoading = undefined;
      throw error;
    }
  );
  return fontAwesomeLoading;
}

/**
 * Resolves a Font Awesome icon name to SVG markup.
 *
 * @param name the icon name, such as "fa:fa-car".
 * @returns the icon markup, or null if the icon is unknown or not loaded.
 */
const resolveIcon: IconResolver = (name) => {
  const match = name.match(fontAwesomeIconRegex);
  if (
    !fontAwesomeIcons ||
    !match ||
    match.index !== 0 ||
    match[0].length !== name.length
  ) {
    return null;
  }

  const [, prefix, iconName] = match;
  const pack =
    prefix === "fab" || prefix === "fa-brands"
      ? fontAwesomeIcons.brands
      : fontAwesomeIcons.solid;
  const iconDef = pack.get(iconName);
  if (!iconDef) {
    return null;
  }

  // icon array layout: [width, height, ligatures, unicode, svgPathData]
  const [width, height, , , paths] = iconDef.icon;
  const body = (Array.isArray(paths) ? paths : [paths])
    .map((path) => `<path d="${path}"/>`)
    .join("");
  return `<svg viewBox="0 0 ${width} ${height}" fill="currentColor" stroke="none">${body}</svg>`;
};

/**
 * Renders a diagram synchronously if Pele, the diagram type and any icons it
 * references are already loaded.
 *
 * @param text the diagram source.
 * @param options the render options.
 * @returns the SVG markup, or undefined if something must load first.
 */
function renderSync(text: string, options: RenderOptions): string | undefined {
  if (!pele || (fontAwesomeIconRegex.test(text) && !fontAwesomeIcons)) {
    return undefined;
  }

  let type: DiagramType | null = null;
  try {
    type = pele.detectType(text);
  } catch (_err) {
    return undefined;
  }
  if (!type || !pele.registered(type)) {
    return undefined;
  }
  return pele.render(text, options).svg;
}

/**
 * Loads what a diagram needs, then renders it. Concurrent calls with the same
 * key share one render.
 *
 * @param key the cache key of the diagram.
 * @param text the diagram source.
 * @param options the render options.
 * @returns the SVG markup.
 */
function renderAsync(
  key: string,
  text: string,
  options: RenderOptions
): Promise<string> {
  const existing = pending.get(key);
  if (existing) {
    return existing;
  }

  const promise = Promise.all([
    import("pele/lazy"),
    fontAwesomeIconRegex.test(text) ? loadFontAwesomeIcons() : undefined,
  ]).then(async ([module]) => {
    pele = module;
    const { svg } = await module.renderAsync(text, options);
    return svg;
  });

  pending.set(key, promise);
  const clear = () => pending.delete(key);
  promise.then(clear, clear);
  return promise;
}

class MermaidRenderer {
  readonly diagramId: string;
  readonly element: HTMLElement;
  readonly elementId: string;

  /** The editor the diagram belongs to. */
  private readonly editor: Editor;

  /** The source of the diagram rendered, or being rendered, into the element. */
  private renderedText?: string;

  constructor(editor: Editor) {
    this.editor = editor;
    this.diagramId = uuidv4();
    this.elementId = `${EditorStyleHelper.mermaidDiagram}-${this.diagramId}`;
    this.element =
      document.getElementById(this.elementId) || document.createElement("div");
    this.element.id = this.elementId;
    this.element.classList.add(EditorStyleHelper.mermaidDiagram);
  }

  render = async (block: { node: Node; pos: number }) => {
    const element = this.element;
    const text = block.node.textContent;

    if (this.renderedText === text) {
      return;
    }
    this.renderedText = text;

    if (text.trim().length === 0) {
      element.innerText = t("Empty diagram");
      element.classList.remove("parse-error");
      element.classList.add("empty");
      return;
    }

    const cacheKey = hashString(text);
    const cached = cache.get(cacheKey);
    if (cached) {
      element.classList.remove("parse-error", "empty");
      element.innerHTML = cached;
      return;
    }

    const { theme } = this.editor.props;
    const options: RenderOptions = {
      // Pele measures labels with these fonts, the CSS variables only draw them.
      fontFamily: theme.fontFamily,
      fontFamilyMono: theme.fontFamilyMono,
      // Stable across renders, so cached markup stays valid.
      idPrefix: `pele-${cacheKey}`,
      icons: resolveIcon,
    };

    try {
      const svg =
        renderSync(text, options) ??
        (await renderAsync(cacheKey, text, options));

      // A newer render replaced this one while it was in progress.
      if (this.renderedText !== text) {
        return;
      }

      element.classList.remove("parse-error", "empty");
      element.innerHTML = svg;
      cache.set(cacheKey, svg);
    } catch (error) {
      if (this.renderedText !== text) {
        return;
      }

      // Allow a later state change to retry the render.
      this.renderedText = undefined;
      element.innerText = errToString(error);
      element.classList.remove("empty");
      element.classList.add("parse-error");
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
  editor,
  pluginState,
  autoEditEmpty = false,
}: {
  doc: Node;
  editor: Editor;
  pluginState: MermaidState;
  autoEditEmpty?: boolean;
}): MermaidState {
  const decorations: Decoration[] = [];
  const usedRenderers = new Set<MermaidRenderer>();
  let newEditingId: string | undefined;

  // Find all blocks that represent Mermaid diagrams (supports both "mermaid" and "mermaidjs"),
  // descending into containers so diagrams inside toggle blocks are also discovered.
  const blocks = findBlockNodes(doc, true).filter((item) =>
    isMermaid(item.node)
  );

  blocks.forEach((block) => {
    const existingDecorations = pluginState.decorationSet
      .find(
        block.pos,
        block.pos + block.node.nodeSize,
        (spec) => !!spec.diagramId
      )
      // A widget sitting exactly at the start of this block belongs to the
      // preceding diagram, whose end position is shared with this one.
      .filter((decoration) => {
        if (
          decoration.from === decoration.to &&
          decoration.from === block.pos
        ) {
          return false;
        }
        // Each renderer owns a single DOM element, so it can only back one
        // diagram — reusing it would place the same node in two places.
        return !usedRenderers.has(decoration.spec.renderer);
      });

    const bestDecoration = findBestOverlapDecoration(
      existingDecorations,
      block
    );

    const isNewBlock = !bestDecoration;
    const renderer: MermaidRenderer =
      bestDecoration?.spec?.renderer ?? new MermaidRenderer(editor);
    usedRenderers.add(renderer);

    // Auto-enter edit mode for newly created empty mermaid diagrams
    if (
      autoEditEmpty &&
      isNewBlock &&
      block.node.textContent.trim().length === 0
    ) {
      newEditingId = renderer.diagramId;
    }

    void renderer.render(block);

    const diagramDecoration = Decoration.widget(
      block.pos + block.node.nodeSize,
      () => renderer.element,
      {
        diagramId: renderer.diagramId,
        renderer,
        side: -10,
        key: `mermaid-${renderer.diagramId}`,
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

export default function Mermaid({ editor }: { editor: Editor }) {
  const { onClickLink, onNotice } = editor.props;

  return new Plugin({
    key: pluginKey,
    state: {
      init: (_, { doc }) => {
        const pluginState: MermaidState = {
          decorationSet: DecorationSet.create(doc, []),
        };
        return getNewState({
          doc,
          editor,
          pluginState,
        });
      },
      apply: (
        transaction: Transaction,
        pluginState: MermaidState,
        oldState,
        state
      ) => {
        const mermaidMeta = transaction.getMeta(pluginKey);

        const nextPluginState = {
          ...pluginState,
          editingId:
            mermaidMeta && "editingId" in mermaidMeta
              ? mermaidMeta.editingId
              : pluginState.editingId,
          decorationSet: mapDecorations(
            pluginState.decorationSet,
            transaction,
            state
          ),
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

        // For a NodeSelection, $head.parent resolves to the selection's
        // parent — so also inspect the selected node and its descendants to
        // catch e.g. drag-and-drop of a container that holds a diagram.
        const selectedNode =
          state.selection instanceof NodeSelection
            ? state.selection.node
            : null;
        const previousSelectedNode =
          oldState.selection instanceof NodeSelection
            ? oldState.selection.node
            : null;
        const codeBlockChanged =
          transaction.docChanged &&
          (isMermaid(node) ||
            isMermaid(previousNode) ||
            containsMermaid(selectedNode) ||
            containsMermaid(previousSelectedNode));

        const isPaste = transaction.getMeta("paste");

        if (
          isPaste ||
          mermaidMeta ||
          codeBlockChanged ||
          isRemoteTransaction(transaction, state)
        ) {
          return getNewState({
            doc: transaction.doc,
            editor,
            pluginState: nextPluginState,
            autoEditEmpty:
              codeBlockChanged &&
              transaction.docChanged &&
              !isPaste &&
              !isRemoteTransaction(transaction, state),
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
    props: {
      decorations(state) {
        return this.getState(state)?.decorationSet;
      },
      handleKeyDown(view, event) {
        if (
          event.key === "Enter" &&
          isModKey(event) &&
          !editor.props.readOnly
        ) {
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
          const diagram = target?.closest(
            `.${EditorStyleHelper.mermaidDiagram}`
          );
          if (!diagram) {
            return false;
          }

          // Let clicks on a link within the diagram through, they are handled
          // on mouseup and should not select the node or open the lightbox.
          if (target?.closest("a") instanceof SVGAElement) {
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
            // Already selected or read-only, open lightbox unless the diagram
            // failed to render (no valid image to show)
            const hasError =
              diagram.classList.contains("parse-error") ||
              diagram.classList.contains("empty");
            if (!hasError && node && node.textContent.trim().length > 0) {
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
          const diagram = target?.closest(
            `.${EditorStyleHelper.mermaidDiagram}`
          );
          if (!diagram) {
            return false;
          }

          const anchor = target?.closest("a");
          if (anchor instanceof SVGAElement) {
            const href = anchor.getAttribute("href");

            try {
              if (onClickLink && href) {
                event.stopPropagation();
                event.preventDefault();
                onClickLink(sanitizeUrl(href) ?? "");
              }
            } catch (_err) {
              onNotice?.(
                t("Sorry, that type of link is not supported"),
                "error"
              );
            }
          }

          return false;
        },
      },
    },
  });
}

function containsMermaid(node: Node | null): boolean {
  if (!node) {
    return false;
  }
  if (isMermaid(node)) {
    return true;
  }
  let found = false;
  node.descendants((child) => {
    if (found) {
      return false;
    }
    found = isMermaid(child);
    return !found;
  });
  return found;
}
