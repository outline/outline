import deburr from "lodash/deburr";
import escapeRegExp from "lodash/escapeRegExp";
import { observable } from "mobx";
import { Node } from "prosemirror-model";
import { Command, Plugin, PluginKey } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import * as React from "react";
import scrollIntoView from "scroll-into-view-if-needed";
import Extension, { WidgetProps } from "@shared/editor/lib/Extension";
import FindAndReplace from "../components/FindAndReplace";

const pluginKey = new PluginKey("find-and-replace");

export default class FindAndReplaceExtension extends Extension {
  public get name() {
    return "find-and-replace";
  }

  public get defaultOptions() {
    return {
      resultClassName: "find-result",
      resultCurrentClassName: "current-result",
      caseSensitive: false,
      regexEnabled: false,
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

  private get decorations() {
    return this.results.map((deco, index) =>
      Decoration.inline(deco.from, deco.to, {
        class:
          this.options.resultClassName +
          (this.currentResultIndex === index
            ? ` ${this.options.resultCurrentClassName}`
            : ""),
      })
    );
  }

  public replace(replace: string): Command {
    return (state, dispatch) => {
      // Redo the search to ensure we have the latest results, the document may
      // have changed underneath us since the last search.
      this.search(state.doc);

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
      return true;
    };
  }

  public clear(): Command {
    return (state, dispatch) => {
      this.searchTerm = "";
      this.currentResultIndex = 0;

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
        if (this.currentResultIndex === this.results.length - 1) {
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

      const element = window.document.querySelector(
        `.${this.options.resultCurrentClassName}`
      );
      if (element) {
        scrollIntoView(element, {
          scrollMode: "if-needed",
          block: "center",
        });
      }
      return true;
    };
  }

  private rebaseNextResult(replace: string, index: number, lastOffset = 0) {
    const nextIndex = index + 1;

    if (!this.results[nextIndex]) {
      return undefined;
    }

    const { from: currentFrom, to: currentTo } = this.results[index];
    const offset = currentTo - currentFrom - replace.length + lastOffset;
    const { from, to } = this.results[nextIndex];

    this.results[nextIndex] = {
      to: to - offset,
      from: from - offset,
    };

    return offset;
  }

  private search(doc: Node) {
    this.results = [];
    const mergedTextNodes: {
      text: string | undefined;
      pos: number;
    }[] = [];
    let index = 0;

    if (!this.searchTerm) {
      return;
    }

    doc.descendants((node, pos) => {
      if (node.isText) {
        if (mergedTextNodes[index]) {
          mergedTextNodes[index] = {
            text: mergedTextNodes[index].text + (node.text ?? ""),
            pos: mergedTextNodes[index].pos,
          };
        } else {
          mergedTextNodes[index] = {
            text: node.text,
            pos,
          };
        }
      } else {
        index += 1;
      }
    });

    mergedTextNodes.forEach(({ text = "", pos }) => {
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
          const from = pos + i;
          const to = from + m[0].length;

          // Check if already exists in results, possible due to duplicated
          // search string on L257
          if (this.results.some((r) => r.from === from && r.to === to)) {
            continue;
          }

          this.results.push({ from, to });
        }
      } catch (e) {
        // Invalid RegExp
      }
    });
  }

  private createDeco(doc: Node) {
    this.search(doc);
    return this.decorations
      ? DecorationSet.create(doc, this.decorations)
      : DecorationSet.empty;
  }

  get allowInReadOnly() {
    return true;
  }

  get focusAfterExecution() {
    return false;
  }

  get plugins() {
    return [
      new Plugin({
        key: pluginKey,
        state: {
          init: () => DecorationSet.empty,
          apply: (tr, decorationSet) => {
            const action = tr.getMeta(pluginKey);

            if (action) {
              if (action.open) {
                this.open = true;
              }
              return this.createDeco(tr.doc);
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
      }),
    ];
  }

  public widget = ({ readOnly }: WidgetProps) => (
    <FindAndReplace
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

  private results: { from: number; to: number }[] = [];
  private currentResultIndex = 0;
  private searchTerm = "";
}
