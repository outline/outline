import { last, sortBy } from "es-toolkit/compat";
import { v4 as uuidv4 } from "uuid";
import type { Node } from "prosemirror-model";
import type { Transaction } from "prosemirror-state";
import {
  NodeSelection,
  Plugin,
  PluginKey,
  TextSelection,
} from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { isCode } from "../lib/isCode";
import { isRemoteTransaction, mapDecorations } from "../lib/multiplayer";
import { findBlockNodes } from "../queries/findChildren";
import { findParentNode } from "../queries/findParentNode";
import type { NodeWithPos } from "../types";
import type { Editor } from "../../../app/editor";
import { LightboxImageFactory } from "../lib/Lightbox";
import { hashString } from "../../utils/string";
import { sanitizeUrl } from "../../utils/urls";
import { isModKey } from "../../utils/keyboard";
import { render as krokiRender } from "../lib/KrokiClient";

export const pluginKey = new PluginKey("diagramService");

export type DiagramServiceState = {
  decorationSet: DecorationSet;
  isDark: boolean;
  editingId?: string;
};

const STORAGE_PREFIX = "kroki:v1:";
const MAX_STORAGE_ENTRIES = 20;
const DEBOUNCE_MS = 500;

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

/**
 * Retrieves Kroki integration settings from the editor embed configuration.
 *
 * @param editor - the editor instance.
 * @returns the Kroki settings with URL and enabled formats, or undefined if not configured.
 */
function getKrokiSettings(
  editor: Editor
): { url: string; enabledFormats: string[] } | undefined {
  const embed = editor.props.embeds?.find((e) => e.name === "kroki");
  const settings = embed?.settings?.kroki;
  if (!settings?.url) {
    return undefined;
  }

  let enabledFormats: string[];
  if (settings.enabledFormats) {
    enabledFormats = settings.enabledFormats;
  } else {
    // Legacy or unconfigured: enable all known Kroki formats except mermaid
    enabledFormats = [
      "actdiag", "blockdiag", "bpmn", "bytefield", "c4plantuml", "d2",
      "dbml", "ditaa", "dot", "erd", "excalidraw", "graphviz", "goat",
      "nomnoml", "nwdiag", "packetdiag", "pikchr", "plantuml", "rackdiag",
      "seqdiag", "structurizr", "svgbob", "symbolator", "tikz", "umlet",
      "vega", "vegalite", "wavedrom", "wireviz",
    ];
    if ("mermaid" in settings && settings.mermaid === true) {
      enabledFormats.push("mermaid");
    }
  }

  return { url: settings.url, enabledFormats };
}

/**
 * Normalizes a code block language attribute to a canonical format name.
 *
 * @param language - the raw language attribute value.
 * @returns the normalized language identifier.
 */
function normalizeLanguage(language: string): string {
  if (language === "puml") {
    return "plantuml";
  }
  if (language === "mermaidjs") {
    return "mermaid";
  }
  return language;
}

/**
 * Maps a code block language attribute to the Kroki API language parameter.
 * For known aliases it maps them; for everything else it passes through directly.
 *
 * @param language - the node language attribute value.
 * @returns the language identifier for the Kroki API.
 */
function getLanguageForKroki(language: string): string {
  if (language === "puml") {
    return "plantuml";
  }
  if (language === "mermaidjs") {
    return "mermaid";
  }
  return language;
}

/**
 * Returns true if the given node is a diagram that should be rendered by this
 * plugin, based on the dynamically configured enabled formats.
 *
 * @param node - the node to check.
 * @param enabledFormats - the list of format identifiers the plugin handles.
 * @returns true if the node should be handled.
 */
function isDiagramNode(node: Node, enabledFormats: string[]): boolean {
  if (!isCode(node)) {
    return false;
  }
  const lang = normalizeLanguage(node.attrs.language);
  if (!lang) {
    return false;
  }
  return enabledFormats.includes(lang);
}

class DiagramServiceRenderer {
  readonly diagramId: string;
  readonly element: HTMLElement;
  readonly elementId: string;
  readonly editor: Editor;

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private abortController: AbortController | null = null;
  private lastRenderedKey: string | null = null;

  constructor(editor: Editor) {
    this.diagramId = uuidv4();
    this.elementId = `diagram-service-wrapper-${this.diagramId}`;
    this.element =
      document.getElementById(this.elementId) || document.createElement("div");
    this.element.id = this.elementId;
    this.element.classList.add("diagram-service-wrapper");
    this.editor = editor;
  }

  render = (
    block: { node: Node; pos: number },
    isDark: boolean,
    krokiUrl: string
  ) => {
    const text = block.node.textContent;
    const language = getLanguageForKroki(block.node.attrs.language ?? "");
    const cacheKey = `${isDark ? "dark" : "light"}-${language}-${text}`;

    // If nothing changed since last render, skip
    if (this.lastRenderedKey === cacheKey) {
      return;
    }

    const isEmpty = text.trim().length === 0;
    if (isEmpty) {
      this.cancelPending();
      this.lastRenderedKey = cacheKey;
      this.element.innerText = "Empty diagram";
      this.element.classList.remove("parse-error", "loading");
      this.element.classList.add("empty");
      return;
    }

    // Check cache first
    const cached = Cache.get(cacheKey);
    if (cached) {
      this.cancelPending();
      this.lastRenderedKey = cacheKey;
      this.element.classList.remove("parse-error", "empty", "loading");
      this.element.innerHTML = cached;
      return;
    }

    // Show loading state and debounce the request
    this.element.classList.remove("parse-error", "empty");
    this.element.classList.add("loading");
    this.element.innerText = "Rendering…";

    this.cancelPending();

    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      void this.fetchRender(cacheKey, language, text, isDark, krokiUrl);
    }, DEBOUNCE_MS);
  };

  private async fetchRender(
    cacheKey: string,
    language: string,
    source: string,
    isDark: boolean,
    krokiUrl: string
  ) {
    this.abortController = new AbortController();
    const { signal } = this.abortController;

    try {
      const svg = await krokiRender(
        krokiUrl,
        language,
        source,
        isDark,
        signal
      );

      this.lastRenderedKey = cacheKey;
      this.element.classList.remove("parse-error", "empty", "loading");
      this.element.innerHTML = svg;

      Cache.set(cacheKey, svg);
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      this.lastRenderedKey = cacheKey;
      this.element.classList.remove("empty", "loading");
      this.element.classList.add("parse-error");

      if (error instanceof Error) {
        this.element.innerText = error.message;
      } else {
        this.element.innerText = "Failed to render diagram";
      }
    } finally {
      this.abortController = null;
    }
  }

  private cancelPending() {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
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

/**
 * Finds the decoration with the greatest overlap with a given node position.
 *
 * @param decorations - the list of decorations to search.
 * @param block - the node with position to match against.
 * @returns the best matching decoration, or undefined if none.
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
  krokiUrl,
  enabledFormats,
  autoEditEmpty = false,
}: {
  doc: Node;
  pluginState: DiagramServiceState;
  editor: Editor;
  krokiUrl: string | undefined;
  enabledFormats: string[];
  autoEditEmpty?: boolean;
}): DiagramServiceState {
  // If Kroki is not configured, return empty decorations
  if (!krokiUrl) {
    return {
      ...pluginState,
      decorationSet: DecorationSet.create(doc, []),
    };
  }

  const decorations: Decoration[] = [];
  let newEditingId: string | undefined;

  const blocks = findBlockNodes(doc, true).filter((item) =>
    isDiagramNode(item.node, enabledFormats)
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

    const isNewBlock = !bestDecoration;
    const renderer: DiagramServiceRenderer =
      bestDecoration?.spec?.renderer ?? new DiagramServiceRenderer(editor);

    // Auto-enter edit mode for newly created empty diagram blocks
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
        renderer.render(block, pluginState.isDark, krokiUrl);
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

/**
 * Creates a ProseMirror plugin that renders D2, PlantUML, and optionally
 * Mermaid diagrams via the Kroki service. The plugin is feature-gated by the
 * presence of a Kroki integration URL in the editor embed configuration.
 *
 * @param options - plugin options containing isDark theme flag and editor instance.
 * @returns a ProseMirror Plugin instance.
 */
export default function DiagramService({
  isDark,
  editor,
}: {
  isDark: boolean;
  editor: Editor;
}) {
  const settings = getKrokiSettings(editor);
  const krokiUrl = settings?.url;
  const enabledFormats = settings?.enabledFormats ?? [];

  return new Plugin({
    key: pluginKey,
    state: {
      init: (_, { doc }) => {
        const pluginState: DiagramServiceState = {
          decorationSet: DecorationSet.create(doc, []),
          isDark,
        };
        return getNewState({
          doc,
          pluginState,
          editor,
          krokiUrl,
          enabledFormats,
        });
      },
      apply: (
        transaction: Transaction,
        pluginState: DiagramServiceState,
        oldState,
        state
      ) => {
        const themeMeta = transaction.getMeta("theme");
        const diagramMeta = transaction.getMeta(pluginKey);
        const themeToggled = themeMeta?.isDark !== undefined;

        const nextPluginState: DiagramServiceState = {
          ...pluginState,
          isDark: themeToggled ? themeMeta.isDark : pluginState.isDark,
          editingId:
            diagramMeta && "editingId" in diagramMeta
              ? diagramMeta.editingId
              : pluginState.editingId,
          decorationSet: mapDecorations(pluginState.decorationSet, transaction),
        };

        if (
          transaction.selectionSet &&
          nextPluginState.editingId &&
          !diagramMeta
        ) {
          const codeBlock = findParentNode(isCode)(state.selection);
          let isEditing =
            codeBlock && isDiagramNode(codeBlock.node, enabledFormats);

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
          (isDiagramNode(node, enabledFormats) ||
            isDiagramNode(previousNode, enabledFormats));

        // @ts-expect-error accessing private field.
        const isPaste = transaction.meta?.paste;

        if (
          isPaste ||
          diagramMeta ||
          themeToggled ||
          codeBlockChanged ||
          isRemoteTransaction(transaction)
        ) {
          return getNewState({
            doc: transaction.doc,
            pluginState: nextPluginState,
            editor,
            krokiUrl,
            enabledFormats,
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
      if (!krokiUrl) {
        return null;
      }

      const { selection } = newState;
      if (selection instanceof NodeSelection) {
        return null;
      }

      const codeBlock = findParentNode(isCode)(selection);
      if (!codeBlock || !isDiagramNode(codeBlock.node, enabledFormats)) {
        return null;
      }

      const dsState = pluginKey.getState(newState) as DiagramServiceState;
      const decorations = dsState?.decorationSet.find(
        codeBlock.pos,
        codeBlock.pos + codeBlock.node.nodeSize
      );
      const nodeDecoration = decorations?.find(
        (d) => d.spec.diagramId && d.from === codeBlock.pos
      );

      if (
        nodeDecoration?.spec.diagramId &&
        dsState?.editingId === nodeDecoration.spec.diagramId
      ) {
        return null;
      }

      return newState.tr.setSelection(
        NodeSelection.create(newState.doc, codeBlock.pos)
      );
    },
    view: (view) => {
      if (krokiUrl) {
        view.dispatch(view.state.tr.setMeta(pluginKey, { loaded: true }));
      }
      return {};
    },
    props: {
      decorations(state) {
        return this.getState(state)?.decorationSet;
      },
      handleKeyDown(view, event) {
        if (!krokiUrl) {
          return false;
        }

        if (
          event.key === "Enter" &&
          isModKey(event) &&
          !editor.props.readOnly
        ) {
          const { selection } = view.state;
          const isNodeSel = selection instanceof NodeSelection;
          const isDiagram =
            isNodeSel &&
            isDiagramNode((selection as NodeSelection).node, enabledFormats);
          if (isNodeSel && isDiagram) {
            toggleEditMode(view, enabledFormats);
            return true;
          }
        }

        if (event.key === "Escape") {
          const dsState = pluginKey.getState(
            view.state
          ) as DiagramServiceState;
          const codeBlock = findParentNode(isCode)(view.state.selection);

          if (dsState?.editingId) {
            if (
              codeBlock &&
              isDiagramNode(codeBlock.node, enabledFormats)
            ) {
              toggleEditMode(view, enabledFormats);
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
          if (!krokiUrl) {
            return false;
          }

          const target = event.target as HTMLElement;
          const diagram = target?.closest(".diagram-service-wrapper");
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
                .setSelection(
                  NodeSelection.create(view.state.doc, nodePos)
                )
                .scrollIntoView()
            );
          }
          return true;
        },
        mouseup(view, event) {
          if (!krokiUrl) {
            return false;
          }

          const target = event.target as HTMLElement;
          const diagram = target?.closest(".diagram-service-wrapper");
          if (!diagram) {
            return false;
          }

          const anchor = target?.closest("a");
          if (anchor instanceof SVGAElement) {
            const href = anchor.getAttribute("xlink:href");

            try {
              if (editor.props.onClickLink && href) {
                event.stopPropagation();
                event.preventDefault();
                editor.props.onClickLink(sanitizeUrl(href) ?? "");
              }
            } catch {
              // link type not supported
            }
          }

          return false;
        },
      },
    },
  });
}

/**
 * Toggles edit mode for the diagram code block under the current selection.
 *
 * @param view - the editor view.
 * @param enabledFormats - the list of format identifiers the plugin handles.
 */
function toggleEditMode(
  view: { state: import("prosemirror-state").EditorState; dispatch: (tr: Transaction) => void },
  enabledFormats: string[]
) {
  const { state } = view;
  const codeBlock =
    state.selection instanceof NodeSelection && isCode(state.selection.node)
      ? { pos: state.selection.from, node: state.selection.node }
      : findParentNode(isCode)(state.selection);

  if (!codeBlock || !isDiagramNode(codeBlock.node, enabledFormats)) {
    return;
  }

  const dsState = pluginKey.getState(state) as DiagramServiceState;
  const decorations = dsState?.decorationSet.find(
    codeBlock.pos,
    codeBlock.pos + codeBlock.node.nodeSize
  );
  const nodeDecoration = decorations?.find(
    (d) => d.spec.diagramId && d.from === codeBlock.pos
  );
  const diagramId = nodeDecoration?.spec.diagramId;

  if (diagramId) {
    view.dispatch(
      state.tr
        .setMeta(pluginKey, {
          editingId: dsState?.editingId === diagramId ? undefined : diagramId,
        })
        .setSelection(TextSelection.create(state.doc, codeBlock.pos + 1))
        .scrollIntoView()
    );
  }
}
