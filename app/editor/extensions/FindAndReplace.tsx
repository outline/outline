import { deburr, escapeRegExp } from "es-toolkit/compat";
import { observable } from "mobx";
import type { Node } from "prosemirror-model";
import type { Command } from "prosemirror-state";
import { Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import scrollIntoView from "scroll-into-view-if-needed";
import type { WidgetProps } from "@shared/editor/lib/Extension";
import Extension from "@shared/editor/lib/Extension";
import { Action, toggleFoldPluginKey } from "@shared/editor/nodes/ToggleBlock";
import { isToggleBlock } from "@shared/editor/queries/toggleBlock";
import { ancestors } from "@shared/editor/utils";
import isTextInput from "~/utils/isTextInput";
import FindAndReplace from "../components/FindAndReplace";

const pluginKey = new PluginKey("find-and-replace");
const supportsHighlightAPI =
  typeof CSS !== "undefined" && CSS.highlights !== undefined;

/**
 * Options for the FindAndReplace extension.
 */
type FindAndReplaceOptions = {
  /** Whether the search should be case sensitive by default. */
  caseSensitive: boolean;
  /** Whether the search query should be interpreted as a regular expression by default. */
  regexEnabled: boolean;
};

export default class FindAndReplaceExtension extends Extension<FindAndReplaceOptions> {
  public get name() {
    return "find-and-replace";
  }

  public get defaultOptions(): FindAndReplaceOptions {
    return {
      caseSensitive: false,
      regexEnabled: false,
    };
  }

  keys(): Record<string, Command> {
    return {
      Escape: () => {
        if (!this.searchTerm) {
          return false;
        }
        this.handleEscape();
        return true;
      },
    };
  }

  public commands() {
    return {
      /**
       * Find all matching results in the document for the given options
       *
       * @param attrs.text The search query
       * @param attrs.caseSensitive Whether the search should be case sensitive
       * @param attrs.regexEnabled Whether the search should be a regex
       *
       * @returns A command that finds all matching results
       */
      find: (attrs: {
        text: string;
        caseSensitive?: boolean;
        regexEnabled?: boolean;
      }) => this.find(attrs.text, attrs.caseSensitive, attrs.regexEnabled),

      /**
       * Find and highlight the next matching result in the document
       */
      nextSearchMatch: () => this.goToMatch(1),

      /**
       * Find and highlight the previous matching result in the document
       */
      prevSearchMatch: () => this.goToMatch(-1),

      /**
       * Replace the current highlighted result with the given text
       *
       * @param attrs.text The text to replace the current result with
       */
      replace: (attrs: { text: string }) => this.replace(attrs.text),

      /**
       * Replace all matching results with the given text
       *
       * @param attrs.text The text to replace all results with
       */
      replaceAll: (attrs: { text: string }) => this.replaceAll(attrs.text),

      /**
       * Clear the current search
       */
      clearSearch: () => this.clear(),

      /**
       * Open the find and replace UI
       */
      openFindAndReplace: () => this.openFindAndReplace(),
    };
  }

  public replace(replace: string): Command {
    return (state, dispatch) => {
      // Redo the search to ensure we have the latest results, the document may
      // have changed underneath us since the last search.
      this.search(state.doc);

      if (this.currentResultIndex >= this.results.length) {
        return false;
      }

      const result = this.results[this.currentResultIndex];

      if (!result) {
        return false;
      }

      const { from, to } = result;
      dispatch?.(state.tr.insertText(replace, from, to).setMeta(pluginKey, {}));

      return true;
    };
  }

  public replaceAll(replace: string): Command {
    return (state, dispatch) => {
      // Redo the search to ensure we have the latest results, the document may
      // have changed underneath us since the last search.
      this.search(state.doc);

      const tr = state.tr;
      let offset: number | undefined;

      if (!this.results.length) {
        return false;
      }

      this.results.forEach(({ from, to }, index) => {
        tr.insertText(replace, from, to);
        offset = this.rebaseNextResult(replace, index, offset);
      });

      dispatch?.(tr);
      return true;
    };
  }

  public find(
    searchTerm: string,
    caseSensitive = this.options.caseSensitive,
    regexEnabled = this.options.regexEnabled
  ): Command {
    return (state, dispatch) => {
      this.options.caseSensitive = caseSensitive;
      this.options.regexEnabled = regexEnabled;
      this.searchTerm = regexEnabled ? searchTerm : escapeRegExp(searchTerm);
      this.currentResultIndex = 0;

      dispatch?.(state.tr.setMeta(pluginKey, {}));
      this.expandFoldedTogglesForCurrentMatch();
      this.scrollToCurrentMatch();

      return true;
    };
  }

  public clear(): Command {
    return (state, dispatch) => {
      this.searchTerm = "";
      this.currentResultIndex = 0;
      this.results = [];
      this.clearHighlights();

      dispatch?.(state.tr.setMeta(pluginKey, {}));
      return true;
    };
  }

  public openFindAndReplace(): Command {
    return (state, dispatch) => {
      dispatch?.(state.tr.setMeta(pluginKey, { open: true }));
      return true;
    };
  }

  private get findRegExp() {
    return RegExp(
      this.searchTerm.replace(/\\+$/, ""),
      !this.options.caseSensitive ? "gui" : "gu"
    );
  }

  private goToMatch(direction: number): Command {
    return (state, dispatch) => {
      if (direction > 0) {
        if (this.currentResultIndex >= this.results.length - 1) {
          this.currentResultIndex = 0;
        } else {
          this.currentResultIndex += 1;
        }
      } else {
        if (this.currentResultIndex === 0) {
          this.currentResultIndex = this.results.length - 1;
        } else {
          this.currentResultIndex -= 1;
        }
      }

      dispatch?.(state.tr.setMeta(pluginKey, {}));
      this.expandFoldedTogglesForCurrentMatch();
      this.scrollToCurrentMatch();
      return true;
    };
  }

  private scrollToCurrentMatch() {
    if (supportsHighlightAPI) {
      if (this.currentHighlightRange) {
        const node = this.currentHighlightRange.startContainer;
        const element = node instanceof Element ? node : node.parentElement;
        if (element) {
          scrollIntoView(element, {
            scrollMode: "if-needed",
            block: "center",
          });
        }
      }
    } else {
      const element = window.document.querySelector(".current-result");
      if (element) {
        scrollIntoView(element, {
          scrollMode: "if-needed",
          block: "center",
        });
      }
    }
  }

  /**
   * Expand any folded toggle blocks that contain the current match.
   */
  private expandFoldedTogglesForCurrentMatch() {
    if (this.currentResultIndex >= this.results.length) {
      return;
    }

    const result = this.results[this.currentResultIndex];
    if (!result) {
      return;
    }

    const state = this.editor.view.state;
    const pluginState = toggleFoldPluginKey.getState(state);
    if (!pluginState) {
      return;
    }

    const $pos = state.doc.resolve(result.from);
    const isToggle = isToggleBlock(state);

    // Find all ancestor toggle block IDs that are folded
    const foldedToggleIds = ancestors($pos)
      .filter(
        (node) => isToggle(node) && pluginState.foldedIds.has(node.attrs.id)
      )
      .map((node) => node.attrs.id as string);

    // Unfold each toggle by ID (getting fresh state after each dispatch)
    foldedToggleIds.forEach((toggleId) => {
      const currentState = this.editor.view.state;

      // Find the position of this toggle in the current document
      let togglePos: number | null = null;
      currentState.doc.descendants((node, pos) => {
        if (
          node.type.name === "container_toggle" &&
          node.attrs.id === toggleId
        ) {
          togglePos = pos;
          return false;
        }
        return true;
      });

      if (togglePos !== null) {
        this.editor.view.dispatch(
          currentState.tr.setMeta(toggleFoldPluginKey, {
            type: Action.UNFOLD,
            at: togglePos,
          })
        );
      }
    });
  }

  private rebaseNextResult(replace: string, index: number, lastOffset = 0) {
    const nextIndex = index + 1;

    if (nextIndex >= this.results.length) {
      return undefined;
    }

    const { from: currentFrom, to: currentTo } = this.results[index];
    const offset = currentTo - currentFrom - replace.length + lastOffset;
    const { from, to, type } = this.results[nextIndex];

    this.results[nextIndex] = {
      to: to - offset,
      from: from - offset,
      type,
    };

    return offset;
  }

  private search(doc: Node) {
    this.results = [];
    const mergedTextNodes: (
      | {
          text: string | undefined;
          pos: number;
          type: "inline";
        }
      | {
          text: string | undefined;
          pos: number;
          type: "node";
          nodeSize: number;
        }
    )[] = [];
    let index = 0;

    if (!this.searchTerm) {
      return;
    }

    doc.descendants((node, pos) => {
      if (node.isText) {
        if (mergedTextNodes[index]) {
          mergedTextNodes[index] = {
            type: "inline",
            text: mergedTextNodes[index].text + (node.text ?? ""),
            pos: mergedTextNodes[index].pos,
          };
        } else {
          mergedTextNodes[index] = {
            type: "inline",
            text: node.text,
            pos,
          };
        }
      } else if (node.type.name === "mention") {
        mergedTextNodes[++index] = {
          type: "node",
          nodeSize: node.nodeSize,
          text: node.attrs.label,
          pos,
        };
        ++index;
      } else {
        ++index;
      }
    });

    mergedTextNodes.forEach((node) => {
      const { text = "", pos, type } = node;
      try {
        let m;
        const search = this.findRegExp;

        // We construct a string with the text stripped of diacritics plus the original text for
        // search  allowing to search for diacritics-insensitive matches easily.
        while ((m = search.exec(deburr(text) + text))) {
          if (m[0] === "") {
            break;
          }

          // Reconstruct the correct match position
          const i = m.index >= text.length ? m.index - text.length : m.index;
          const from = type === "inline" ? pos + i : pos;
          const to = from + (type === "inline" ? m[0].length : node.nodeSize);

          // Prevent wrap around matches when the regex matches at the end of the deburred
          // string and continues matching at the start of the original string
          if (i + m[0].length > text.length) {
            continue;
          }

          // Check if already exists in results, possible due to duplicated
          // search string on L257
          if (this.results.some((r) => r.from === from && r.to === to)) {
            continue;
          }

          this.results.push({ from, to, type });
        }
      } catch (_err) {
        // Invalid RegExp
      }
    });
  }

  /**
   * Build ProseMirror decorations from search results (fallback for browsers
   * without CSS Custom Highlight API support).
   */
  private get decorations() {
    return this.results.map((deco, index) => {
      const attrs = {
        class:
          "find-result" +
          (this.currentResultIndex === index ? " current-result" : ""),
      };
      return deco.type === "node"
        ? Decoration.node(deco.from, deco.to, attrs)
        : Decoration.inline(deco.from, deco.to, attrs);
    });
  }

  /**
   * Create a DecorationSet from the current search results.
   */
  private createDecorationSet(doc: Node) {
    this.search(doc);
    const decos = this.decorations;
    return decos.length
      ? DecorationSet.create(doc, decos)
      : DecorationSet.empty;
  }

  /**
   * Update CSS Custom Highlight API highlights based on current search results.
   */
  private updateHighlights() {
    const view = this.editor?.view;
    if (!view || !this.results.length || !this.searchTerm) {
      this.clearHighlights();
      return;
    }

    const allRanges: StaticRange[] = [];
    const currentRanges: StaticRange[] = [];
    this.currentHighlightRange = undefined;

    for (let i = 0; i < this.results.length; i++) {
      const result = this.results[i];
      try {
        const from = view.domAtPos(result.from);
        const to = view.domAtPos(result.to);
        const range = new StaticRange({
          startContainer: from.node,
          startOffset: from.offset,
          endContainer: to.node,
          endOffset: to.offset,
        });
        allRanges.push(range);

        if (i === this.currentResultIndex) {
          currentRanges.push(range);
          this.currentHighlightRange = range;
        }
      } catch {
        // Position may not be in the visible DOM (e.g. inside folded toggle)
      }
    }

    CSS.highlights.set("search-results", new Highlight(...allRanges));
    if (currentRanges.length) {
      CSS.highlights.set(
        "search-results-current",
        new Highlight(...currentRanges)
      );
    } else {
      CSS.highlights.delete("search-results-current");
    }
  }

  private clearHighlights() {
    if (!supportsHighlightAPI) {
      return;
    }
    CSS.highlights.delete("search-results");
    CSS.highlights.delete("search-results-current");
    this.currentHighlightRange = undefined;
  }

  private handleEscape = () => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("q")) {
      params.delete("q");
      const search = params.toString();
      window.history.replaceState(
        window.history.state,
        "",
        window.location.pathname + (search ? `?${search}` : "")
      );
    }

    const view = this.editor?.view;
    if (view) {
      this.clear()(view.state, view.dispatch);
    }
  };

  private handleDocumentKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Escape" || !this.searchTerm) {
      return;
    }
    if (event.defaultPrevented) {
      return;
    }
    if (isTextInput(event.target as HTMLElement)) {
      return;
    }
    this.handleEscape();
  };

  private currentHighlightRange?: StaticRange;

  get allowInReadOnly() {
    return true;
  }

  get focusAfterExecution() {
    return false;
  }

  get plugins() {
    const highlightPlugin = supportsHighlightAPI
      ? this.highlightAPIPlugin
      : this.decorationPlugin;
    return [highlightPlugin, this.escapeListenerPlugin];
  }

  /**
   * Plugin that listens for Escape at the document level so the search
   * highlight can be cleared even when the editor is not focused.
   */
  private get escapeListenerPlugin() {
    return new Plugin({
      view: () => {
        document.addEventListener("keydown", this.handleDocumentKeyDown);
        return {
          destroy: () => {
            document.removeEventListener("keydown", this.handleDocumentKeyDown);
          },
        };
      },
    });
  }

  /** Plugin using the CSS Custom Highlight API (no DOM modifications). */
  private get highlightAPIPlugin() {
    return new Plugin({
      key: pluginKey,
      state: {
        init: () => 0,
        apply: (tr, generation) => {
          const action = tr.getMeta(pluginKey);

          if (action) {
            if (action.open) {
              this.open = true;
            }
            this.search(tr.doc);
            return generation + 1;
          }

          if (tr.docChanged && this.searchTerm) {
            this.search(tr.doc);
            return generation + 1;
          }

          // Toggle fold/unfold changes DOM visibility without changing the doc,
          // so we need to rebuild highlight ranges for newly visible matches.
          if (tr.getMeta(toggleFoldPluginKey) && this.searchTerm) {
            return generation + 1;
          }

          return generation;
        },
      },
      view: () => {
        let lastGeneration = 0;
        return {
          update: (view) => {
            const generation = pluginKey.getState(view.state) as number;
            if (generation !== lastGeneration) {
              lastGeneration = generation;
              this.updateHighlights();
            }
          },
          destroy: () => {
            this.clearHighlights();
          },
        };
      },
    });
  }

  /** Fallback plugin using ProseMirror decorations. */
  private get decorationPlugin() {
    return new Plugin({
      key: pluginKey,
      state: {
        init: () => DecorationSet.empty,
        apply: (tr, decorationSet) => {
          const action = tr.getMeta(pluginKey);

          if (action) {
            if (action.open) {
              this.open = true;
            }
            return this.createDecorationSet(tr.doc);
          }

          if (tr.docChanged) {
            return decorationSet.map(tr.mapping, tr.doc);
          }

          return decorationSet;
        },
      },
      props: {
        decorations(state) {
          return this.getState(state);
        },
      },
    });
  }

  public widget = ({ readOnly }: WidgetProps) => (
    <FindAndReplace
      currentIndex={this.currentResultIndex}
      totalResults={this.results.length}
      readOnly={readOnly}
      open={this.open}
      onOpen={() => {
        this.open = true;
      }}
      onClose={() => {
        this.open = false;
      }}
    />
  );

  @observable
  private open = false;

  @observable
  private results: { from: number; to: number; type: "inline" | "node" }[] = [];

  @observable
  private currentResultIndex = 0;

  private searchTerm = "";
}
