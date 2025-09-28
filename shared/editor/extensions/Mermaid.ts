import debounce from "lodash/debounce";
import last from "lodash/last";
import sortBy from "lodash/sortBy";
// @ts-ignore - js-yaml types may not be available
import * as yaml from "js-yaml";
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
import { merge } from "lodash";
import { icons as logosIcons } from '@iconify-json/logos';
import { icons as notoIcons } from '@iconify-json/noto';
import { icons as streamlineIcons } from '@iconify-json/streamline-color';
import { icons as codeIcons } from '@iconify-json/vscode-icons';
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

let mermaid: typeof MermaidUnsafe;
let elkLayoutsRegistered = false;
let iconPacksRegistered = false;
let mermaidInitialized = false;

type RendererFunc = (
  block: { node: Node; pos: number },
  isDark: boolean
) => void;

/**
 * Extract Frontmatter configuration from Mermaid diagram text
 */
function extractFrontMatter(text: string): ExtractedFrontMatter {
  try {
    const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
    const match = text.match(frontMatterRegex);

    if (!match) {
      return {
        metadata: {},
        text,
      };
    }

    try {
      const yamlContent = match[1];
      // Safely parse YAML with additional error handling
      const metadata = yaml?.load ?
        (yaml.load(yamlContent, { schema: yaml.JSON_SCHEMA }) as FrontMatterMetadata) || {} :
        {};
      const cleanedText = text.replace(frontMatterRegex, '');

      return {
        metadata,
        text: cleanedText,
      };
    } catch (_yamlError) {
      // If YAML parsing fails, return original text without frontmatter
      return {
        metadata: {},
        text: text.replace(frontMatterRegex, ''),
      };
    }
  } catch (_error) {
    // If anything fails, return text as-is
    return {
      metadata: {},
      text,
    };
  }
}


class MermaidRenderer {
  readonly diagramId: string;
  private _element: HTMLElement | null = null;
  readonly elementId: string;
  readonly editor: Editor;

  constructor(editor: Editor) {
    this.diagramId = uuidv4();
    this.elementId = `mermaid-diagram-wrapper-${this.diagramId}`;
    this.editor = editor;
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
    // Top-level error boundary to prevent page crashes
    try {
      const element = this.element;
      if (!element) {
        return;
      }

      const originalText = block.node.textContent;
      let renderElement: HTMLElement | null = null;

      try {
      const { metadata, text } = extractFrontMatter(originalText);

      // Include config in cache key to ensure different configs produce different cached renders
      const configHash = metadata.config ? JSON.stringify(metadata.config) : '';
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

      // Create a temporary element that will render the diagram off-screen. This is necessary
      // as Mermaid will error if the element is not visible, such as if the heading is collapsed
      renderElement = document.createElement("div");
      renderElement.style.position = "absolute";
      renderElement.style.left = "-9999px";
      renderElement.style.top = "-9999px";
      renderElement.style.visibility = "hidden";
      renderElement.style.pointerEvents = "none";

      // Safely append to body
      if (document.body) {
        document.body.appendChild(renderElement);
      } else {
        throw new Error("Document body not available");
      }

      // Create default configuration
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
        securityLevel: "loose" as const, // Allow more diagram types
      };

      // Merge default config with frontmatter config
      let finalConfig = defaultConfig;
      if (metadata.config) {
        try {
          finalConfig = merge({}, defaultConfig, metadata.config) as typeof defaultConfig;
          // Preserve theme switching capability - don't override theme if isDark is set
          if (isDark && !metadata.config.theme) {
            finalConfig.theme = "dark";
          }
          finalConfig.darkMode = isDark;
        } catch (_configError) {
          // Invalid config in frontmatter, using defaults
        }
      }

      // Safely initialize Mermaid
      try {
        mermaid.initialize(finalConfig);
      } catch (_initError) {
        // Failed to initialize with custom config, using defaults
        mermaid.initialize(defaultConfig);
      }

      // Validate text content
      if (!text || text.trim().length === 0) {
        element.innerText = "Empty diagram";
        element.classList.add("empty");
        element.classList.remove("parse-error");
        return;
      }

      // Render the diagram
      const result = await mermaid.render(
        `mermaid-diagram-${this.diagramId}`,
        text,
        // If the element is not visible we use an off-screen element to render the diagram
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

      // Update element safely
      element.classList.remove("parse-error", "empty");
      element.innerHTML = svg;

      // Allow the user to interact with the diagram
      try {
        if (bindFunctions && typeof bindFunctions === 'function') {
          bindFunctions(element);
        }
      } catch (_bindError) {
        // Failed to bind functions - diagram is still functional without interactivity
      }

      } catch (error) {
        this.handleRenderError(element, block.node.textContent, error);
      } finally {
        // Always clean up the render element
        if (renderElement && renderElement.parentNode) {
          try {
            renderElement.parentNode.removeChild(renderElement);
          } catch (_cleanupError) {
            // Failed to cleanup render element
          }
        }
      }
    } catch (_criticalError) {
      // Critical error boundary - prevent page crash
      try {
        const element = this.element;
        if (element) {
          element.innerHTML = '<div class="mermaid-error"><div class="error-title">Critical Error</div><div class="error-message">Mermaid rendering failed catastrophically</div></div>';
          element.classList.add("parse-error");
        }
      } catch (_) {
        // Even the error handling failed - do nothing to prevent further crashes
      }
    }
  };

  private async initializeMermaid(): Promise<void> {
    if (mermaidInitialized && mermaid) {
      return;
    }

    try {
      // Dynamic import with retry logic
      if (!mermaid) {
        mermaid = (await import("mermaid")).default;
      }

      // Register ELK layout loaders if not already done
      if (!elkLayoutsRegistered) {
        try {
          const elkLayouts = await import("@mermaid-js/layout-elk");
          if (elkLayouts.default && mermaid.registerLayoutLoaders) {
            mermaid.registerLayoutLoaders(elkLayouts.default);
          }
          elkLayoutsRegistered = true;
        } catch (_error) {
          // ELK layout package not available
          elkLayoutsRegistered = true; // Prevent retry
        }
      }

      // Register icon packs if not already done
      if (!iconPacksRegistered) {
        try {
          if (mermaid.registerIconPacks) {
            mermaid.registerIconPacks([
              {
                name: 'logos',
                icons: logosIcons,
              },
              {
                name: 'noto',
                icons: notoIcons,
              },
              {
                name: 'streamline',
                icons: streamlineIcons,
              },
              {
                name: 'code',
                icons: codeIcons,
              },
            ]);
          }
          iconPacksRegistered = true;
        } catch (_error) {
          // Icon packs not available
          iconPacksRegistered = true; // Prevent retry
        }
      }

      mermaidInitialized = true;
    } catch (_error) {
      throw new Error("Failed to initialize Mermaid library");
    }
  }

  private handleRenderError(element: HTMLElement, originalText: string, error: unknown): void {
    const isEmpty = originalText.trim().length === 0;

    element.classList.remove("empty");

    if (isEmpty) {
      element.innerText = "Empty diagram";
      element.classList.add("empty");
    } else {
      // Create a more user-friendly error message
      const errorContainer = document.createElement("div");
      errorContainer.className = "mermaid-error";

      const errorTitle = document.createElement("div");
      errorTitle.className = "error-title";
      errorTitle.textContent = "Failed to render Mermaid diagram";

      const errorMessage = document.createElement("div");
      errorMessage.className = "error-message";
      errorMessage.textContent = error instanceof Error ? error.message : String(error);

      const retryButton = document.createElement("button");
      retryButton.className = "error-retry";
      retryButton.textContent = "Retry";
      retryButton.onclick = () => {
        // Clear error state and retry
        mermaidInitialized = false;
        this.renderImmediately({ node: { textContent: originalText } as Node, pos: 0 }, false);
      };

      errorContainer.appendChild(errorTitle);
      errorContainer.appendChild(errorMessage);
      errorContainer.appendChild(retryButton);

      element.innerHTML = "";
      element.appendChild(errorContainer);
      element.classList.add("parse-error");
    }
  }

  get render(): RendererFunc {
    if (this._rendererFunc) {
      return this._rendererFunc;
    }
    this._rendererFunc = debounce<RendererFunc>(this.renderImmediately, 250);
    return this._rendererFunc;
  }

  renderSync(block: { node: Node; pos: number }, isDark: boolean): HTMLElement {
    // Synchronous method for ProseMirror widget decoration
    // Trigger async rendering but return element immediately
    this.renderImmediately(block, isDark).catch((error: unknown) => {
      // Handle errors safely without crashing the page
      try {
        this.handleRenderError(this.element, block.node.textContent, error);
      } catch (_) {
        // Even error handling failed - do nothing to prevent further crashes
      }
    });

    return this.element;
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
  editor,
}: {
  doc: Node;
  name: string;
  pluginState: MermaidState;
  editor: Editor;
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
      bestDecoration?.spec?.renderer ?? new MermaidRenderer(editor);

    const diagramDecoration = Decoration.widget(
      block.pos + block.node.nodeSize,
      () => renderer.renderSync(block, pluginState.isDark),
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
}: {
  name: string;
  isDark: boolean;
  editor: Editor;
}) {
  return new Plugin({
    key: new PluginKey("mermaid"),
    state: {
      init: (_, { doc }) => {
        const pluginState: MermaidState = {
          decorationSet: DecorationSet.create(doc, []),
          isDark,
        };
        // Don't process Mermaid blocks during initial plugin setup
        // This prevents crashes when the DOM isn't ready yet
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
      // Defer Mermaid initialization until the view is fully ready
      // This prevents crashes during initial page load
      setTimeout(() => {
        try {
          view.dispatch(view.state.tr.setMeta("mermaid", { loaded: true }));
        } catch (_error) {
          // If view is destroyed or not ready, ignore silently
        }
      }, 0);
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
