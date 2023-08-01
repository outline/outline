import { Node } from "prosemirror-model";
import { Command, EditorState, Plugin, Transaction } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import scrollIntoView from "smooth-scroll-into-view-if-needed";
import Extension from "../lib/Extension";

export default class FindAndReplace extends Extension {
  public get name() {
    return "find-and-replace";
  }

  public get defaultOptions() {
    return {
      autoSelectNext: true,
      findClassName: "find-result",
      currentResultClassName: "current-result",
      searching: false,
      caseSensitive: false,
    };
  }

  public commands() {
    return {
      find: (attrs: { text: string }) => this.find(attrs.text),
      nextSearchMatch: () => this.goToMatch(1),
      prevSearchMatch: () => this.goToMatch(-1),
      replace: (attrs: { text: string }) => this.replace(attrs.text),
      replaceAll: (attrs: { text: string }) => this.replaceAll(attrs.text),
      clearSearch: () => this.clear(),
    };
  }

  private get findRegExp() {
    return RegExp(this.searchTerm, !this.options.caseSensitive ? "gui" : "gu");
  }

  public get decorations() {
    return this.results.map((deco, index) =>
      Decoration.inline(deco.from, deco.to, {
        class:
          this.options.findClassName +
          (this.currentResultIndex === index
            ? ` ${this.options.currentResultClassName}`
            : ""),
      })
    );
  }

  public replace(replace: string): Command {
    return (state, dispatch) => {
      const firstResult = this.results[0];

      if (!firstResult) {
        return false;
      }

      const { from, to } = this.results[0];
      dispatch?.(state.tr.insertText(replace, from, to));
      this.find(this.searchTerm);

      return true;
    };
  }

  public replaceAll(replace: string): Command {
    return ({ tr }, dispatch) => {
      let offset: number | undefined;

      if (!this.results.length) {
        return false;
      }

      this.results.forEach(({ from, to }, index) => {
        tr.insertText(replace, from, to);
        offset = this.rebaseNextResult(replace, index, offset);
      });

      dispatch?.(tr);

      this.find(this.searchTerm);
      return true;
    };
  }

  public find(searchTerm: string): Command {
    return (state, dispatch) => {
      this.searchTerm = searchTerm;
      this.updateView(state, dispatch);
      return false;
    };
  }

  public clear(): Command {
    return (state, dispatch) => {
      this.searchTerm = "";

      this.updateView(state, dispatch);
      return false;
    };
  }

  private goToMatch(direction: number): Command {
    return (state, dispatch) => {
      if (direction > 0) {
        this.currentResultIndex = Math.min(
          this.currentResultIndex + 1,
          this.results.length - 1
        );
      } else {
        this.currentResultIndex = Math.max(this.currentResultIndex - 1, 0);
      }

      this.updateView(state, dispatch);

      const element = window.document.querySelector(
        `.${this.options.currentResultClassName}`
      );
      if (element) {
        void scrollIntoView(element, {
          scrollMode: "if-needed",
          block: "center",
        });
      }
      return false;
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

  public updateView({ tr }: EditorState, dispatch?: (tr: Transaction) => void) {
    this.isUpdating = true;
    dispatch?.(tr);
    this.isUpdating = false;
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
      const search = this.findRegExp;
      let m;

      while ((m = search.exec(text))) {
        if (m[0] === "") {
          break;
        }

        this.results.push({
          from: pos + m.index,
          to: pos + m.index + m[0].length,
        });
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

  get plugins() {
    return [
      new Plugin({
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply: (tr, old) => {
            if (this.isUpdating || this.options.searching) {
              return this.createDeco(tr.doc);
            }

            if (tr.docChanged) {
              return old.map(tr.mapping, tr.doc);
            }

            return old;
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

  private results: { from: number; to: number }[];
  private currentResultIndex = 0;
  private searchTerm = "";
  private isUpdating = false;
}
