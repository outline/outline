import debounce from "lodash/debounce";
import last from "lodash/last";
import sortBy from "lodash/sortBy";
import { load as loadYaml, JSON_SCHEMA } from "js-yaml";
import type MermaidUnsafe from "mermaid";
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
import { findBlockNodes } from "../queries/findChildren";
import { NodeWithPos } from "../types";
import type { Editor } from "../../../app/editor";
import { LightboxImageFactory } from "../lib/Lightbox";

type MermaidState = {
  decorationSet: DecorationSet;
  isDark: boolean;
};

type FrontMatterMetadata = {
  title?: string;
  displayMode?: string;
  config?: Record<string, unknown>;
  [key: string]: unknown;
};

type ExtractedFrontMatter = {
  metadata: FrontMatterMetadata;
  text: string;
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

// Module-level state for Mermaid library management
// Note: These are intentionally global since Mermaid itself is a singleton
let mermaid: typeof MermaidUnsafe;
let lastInitializedConfigHash = "";

// Cache for frontmatter extraction to avoid re-parsing YAML on every render
const frontMatterCache = new Map<string, ExtractedFrontMatter>();

/**
 * Reset all caches and flags - useful for testing
 * @internal
 */
export function resetMermaidState(): void {
  frontMatterCache.clear();
  lastInitializedConfigHash = "";
}

/**
 * Generate a stable hash for a config object
 * Sorts keys to ensure consistent hashing
 */
function hashConfig(config: Record<string, unknown>): string {
  if (!config || Object.keys(config).length === 0) {
    return "";
  }
  const sortedKeys = Object.keys(config).sort();
  const sortedConfig = sortedKeys.reduce((acc, key) => {
    acc[key] = config[key];
    return acc;
  }, {} as Record<string, unknown>);
  return JSON.stringify(sortedConfig);
}

/**
 * Extract Frontmatter configuration from Mermaid diagram text
 * Results are cached to avoid re-parsing YAML on every render
 */
function extractFrontMatter(text: string): ExtractedFrontMatter {
  // Check cache first
  if (frontMatterCache.has(text)) {
    return frontMatterCache.get(text)!;
  }

  const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
  const match = text.match(frontMatterRegex);

  if (!match) {
    const result = { metadata: {}, text };
    frontMatterCache.set(text, result);
    return result;
  }

  try {
    const yamlContent = match[1];
    const metadata = (loadYaml(yamlContent, { schema: JSON_SCHEMA }) as FrontMatterMetadata) || {};
    const cleanedText = text.replace(frontMatterRegex, '');

    const result = {
      metadata,
      text: cleanedText,
    };

    // Cache with size limit
    if (frontMatterCache.size > 50) {
      const firstKey = frontMatterCache.keys().next().value;
      frontMatterCache.delete(firstKey);
    }
    frontMatterCache.set(text, result);

    return result;
  } catch {
    // If YAML parsing fails, return text without frontmatter
    const result = {
      metadata: {},
      text: text.replace(frontMatterRegex, ''),
    };
    frontMatterCache.set(text, result);
    return result;
  }
}


class MermaidRenderer {
  readonly diagramId: string;
  private _element: HTMLElement | null = null;
  readonly elementId: string;
  readonly editor: Editor;
  readonly iconPackConfigs?: Array<{ name: string; url: string }>;
  private _rendererFunc?: (block: { node: Node; pos: number }, isDark: boolean) => void;

  constructor(editor: Editor, iconPackConfigs?: Array<{ name: string; url: string }>) {
    this.diagramId = uuidv4();
    this.elementId = `mermaid-diagram-wrapper-${this.diagramId}`;
    this.editor = editor;
    this.iconPackConfigs = iconPackConfigs;
  }

  get element(): HTMLElement {
    if (!this._element) {
      // Safety check - only create elements when document is ready
      if (typeof document === 'undefined') {
        throw new Error("Document not available");
      }
      this._element = document.getElementById(this.elementId) || document.createElement("div");
      this._element.id = this.elementId;
      this._element.classList.add("mermaid-diagram-wrapper");
    }
    return this._element;
  }

  renderImmediately = async (
    block: { node: Node; pos: number },
    isDark: boolean
  ) => {
    const element = this.element;
    const originalText = block.node.textContent;
    let renderElement: HTMLElement | null = null;

    try {
      const { metadata, text } = extractFrontMatter(originalText);

      // Use stable hash for cache key
      const configHash = metadata.config ? hashConfig(metadata.config) : '';
      const cacheKey = `${isDark ? "dark" : "light"}-${configHash}-${originalText}`;
      const cache = Cache.get(cacheKey);
      if (cache) {
        element.classList.remove("parse-error", "empty");
        element.innerHTML = cache;
        return;
      }

      // Initialize Mermaid if needed
      await this.initializeMermaid();

      if (!mermaid) {
        throw new Error("Failed to load Mermaid library");
      }

      // Validate text content
      if (!text || text.trim().length === 0) {
        element.innerText = "Empty diagram";
        element.classList.add("empty");
        element.classList.remove("parse-error");
        return;
      }

      // Create a temporary element that will render the diagram off-screen. This is necessary
      // as Mermaid will error if the element is not visible, such as if the heading is collapsed
      renderElement = document.createElement("div");
      renderElement.style.position = "absolute";
      renderElement.style.left = "-9999px";
      renderElement.style.top = "-9999px";
      renderElement.style.visibility = "hidden";
      renderElement.style.pointerEvents = "none";
      document.body.appendChild(renderElement);

      // Build configuration
      const defaultConfig = {
        startOnLoad: true,
        // TODO: Make dynamic based on the width of the editor or remove in
        // the future if Mermaid is able to handle this automatically.
        gantt: { useWidth: 700 },
        pie: { useWidth: 700 },
        elk: { mergeEdges: true },
        fontFamily: getComputedStyle(this.element).fontFamily || "inherit",
        theme: (isDark ? "dark" : "default") as "dark" | "default",
        darkMode: isDark,
        logLevel: "error" as const, // Reduce console noise
        securityLevel: "strict" as const, // Allow more diagram types
      };

      // Merge frontmatter config if present, ensuring theme and darkMode are always set correctly
      const finalConfig = {
        ...defaultConfig,
        ...(metadata.config || {}),
        theme: (isDark ? "dark" : "default") as "dark" | "default",
        darkMode: isDark,
      };

      // Only re-initialize if config has changed
      const finalConfigHash = hashConfig(finalConfig);
      if (finalConfigHash !== lastInitializedConfigHash) {
        mermaid.initialize(finalConfig);
        lastInitializedConfigHash = finalConfigHash;
      }

      // Render the diagram
      // Use off-screen element only if the main element is not visible
      const result = await mermaid.render(
        `mermaid-diagram-${this.diagramId}`,
        text,
        element.offsetParent === null ? renderElement : element
      );

      // Check if result is valid
      if (!result || !result.svg) {
        throw new Error("Mermaid render returned invalid result");
      }

      const { svg, bindFunctions } = result;

      // Cache the rendered SVG so we won't need to calculate it again in the same session
      if (text && svg) {
        Cache.set(cacheKey, svg);
      }

      // Update element
      element.classList.remove("parse-error", "empty");
      element.innerHTML = svg;

      // Allow the user to interact with the diagram
      if (bindFunctions && typeof bindFunctions === 'function') {
        bindFunctions(element);
      }

    } catch (error) {
      this.handleRenderError(element, originalText, error);
    } finally {
      // Always clean up the render element
      if (renderElement && renderElement.parentNode) {
        renderElement.parentNode.removeChild(renderElement);
      }
    }
  };

  get render() {
    if (!this._rendererFunc) {
      this._rendererFunc = debounce(this.renderImmediately.bind(this), 250);
    }
    return this._rendererFunc;
  }

  private async initializeMermaid(): Promise<void> {
    // Dynamic import
    if (!mermaid) {
      mermaid = (await import("mermaid")).default;
    }

    // Always register ELK layout loaders to ensure they're available
    // Re-registering is safe and ensures loaders are available after page navigation
    try {
      const elkLayouts = await import("@mermaid-js/layout-elk");
      if (elkLayouts.default && mermaid.registerLayoutLoaders) {
        mermaid.registerLayoutLoaders(elkLayouts.default);
      }
    } catch {
      // ELK layout package not available
    }

    // Always register icon packs if configs provided
    if (this.iconPackConfigs && this.iconPackConfigs.length > 0) {
      try {
        if (mermaid.registerIconPacks) {
          // Use the loader pattern to fetch icon packs dynamically
          const iconPacks = this.iconPackConfigs.map((config) => ({
            name: config.name,
            loader: () => fetch(config.url).then((res) => res.json()),
          }));
          mermaid.registerIconPacks(iconPacks);
        }
      } catch {
        // Icon packs not available
      }
    }
  }

  handleRenderError(element: HTMLElement, originalText: string, error: unknown): void {
    const isEmpty = originalText.trim().length === 0;

    element.classList.remove("empty");

    if (isEmpty) {
      element.innerText = "Empty diagram";
      element.classList.add("empty");
    } else {
      const errorMessage = error instanceof Error ? error.message : String(error);
      element.innerText = `Failed to render Mermaid diagram: ${errorMessage}`;
      element.classList.add("parse-error");
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
  editor,
  iconPackConfigs,
}: {
  doc: Node;
  name: string;
  pluginState: MermaidState;
  editor: Editor;
  iconPackConfigs?: Array<{ name: string; url: string }>;
}): MermaidState {
  const decorations: Decoration[] = [];

  // Find all blocks that represent Mermaid diagrams
  const blocks = findBlockNodes(doc).filter(
    (item) =>
      item.node.type.name === name && item.node.attrs.language === "mermaidjs"
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

    const renderer: MermaidRenderer =
      bestDecoration?.spec?.renderer ?? new MermaidRenderer(editor, iconPackConfigs);

    const diagramDecoration = Decoration.widget(
      block.pos + block.node.nodeSize,
      () => {
        renderer.render(block, pluginState.isDark);
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
    isDark: pluginState.isDark,
  };
}

export default function Mermaid({
  name,
  isDark,
  editor,
  iconPackConfigs,
}: {
  name: string;
  isDark: boolean;
  editor: Editor;
  iconPackConfigs?: Array<{ name: string; url: string }>;
}) {
  return new Plugin({
    key: new PluginKey("mermaid"),
    state: {
      init: (_, { doc }) => {
        const pluginState: MermaidState = {
          decorationSet: DecorationSet.create(doc, []),
          isDark,
        };
        return getNewState({
          doc,
          name,
          pluginState,
          editor,
          iconPackConfigs,
        });
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
        const themeMeta = transaction.getMeta("theme");
        const mermaidMeta = transaction.getMeta("mermaid");
        const themeToggled = themeMeta?.isDark !== undefined;

        if (themeToggled) {
          pluginState.isDark = themeMeta.isDark;
        }

        if (
          mermaidMeta ||
          themeToggled ||
          codeBlockChanged ||
          isRemoteTransaction(transaction)
        ) {
          return getNewState({
            doc: transaction.doc,
            name,
            pluginState,
            editor,
            iconPackConfigs,
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
        mouseup(view, event) {
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

          if (diagram && event.detail === 1) {
            const { selection: textSelection } = view.state;
            const $pos = view.state.doc.resolve(pos);
            const selected =
              textSelection.from >= $pos.start() &&
              textSelection.to <= $pos.end();
            if (selected || editor.props.readOnly) {
              editor.updateActiveLightboxImage(
                LightboxImageFactory.createLightboxImage(view, $pos.before())
              );
              return true;
            }

            // select node
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
              const $pos = view.state.doc.resolve(
                Math.max(0, selection.from - 1)
              );
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
