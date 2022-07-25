import copy from "copy-to-clipboard";
import Token from "markdown-it/lib/token";
import { textblockTypeInputRule } from "prosemirror-inputrules";
import {
  NodeSpec,
  NodeType,
  Schema,
  Node as ProsemirrorNode,
} from "prosemirror-model";
import {
  EditorState,
  Selection,
  TextSelection,
  Transaction,
  Plugin,
  PluginKey,
} from "prosemirror-state";
import refractor from "refractor/core";
import bash from "refractor/lang/bash";
import clike from "refractor/lang/clike";
import csharp from "refractor/lang/csharp";
import css from "refractor/lang/css";
import go from "refractor/lang/go";
import java from "refractor/lang/java";
import javascript from "refractor/lang/javascript";
import json from "refractor/lang/json";
import markup from "refractor/lang/markup";
import objectivec from "refractor/lang/objectivec";
import perl from "refractor/lang/perl";
import php from "refractor/lang/php";
import powershell from "refractor/lang/powershell";
import python from "refractor/lang/python";
import ruby from "refractor/lang/ruby";
import rust from "refractor/lang/rust";
import solidity from "refractor/lang/solidity";
import sql from "refractor/lang/sql";
import typescript from "refractor/lang/typescript";
import yaml from "refractor/lang/yaml";
import { Dictionary } from "~/hooks/useDictionary";

import toggleBlockType from "../commands/toggleBlockType";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import Mermaid from "../plugins/Mermaid";
import Prism, { LANGUAGES } from "../plugins/Prism";
import isInCode from "../queries/isInCode";
import { Dispatch } from "../types";
import Node from "./Node";

const PERSISTENCE_KEY = "rme-code-language";
const DEFAULT_LANGUAGE = "javascript";

[
  bash,
  css,
  clike,
  csharp,
  go,
  java,
  javascript,
  json,
  markup,
  objectivec,
  perl,
  php,
  python,
  powershell,
  ruby,
  rust,
  sql,
  solidity,
  typescript,
  yaml,
].forEach(refractor.register);

export default class CodeFence extends Node {
  constructor(options: {
    dictionary: Dictionary;
    onShowToast: (message: string) => void;
  }) {
    super(options);
  }

  get languageOptions() {
    return Object.entries(LANGUAGES);
  }

  get name() {
    return "code_fence";
  }

  get schema(): NodeSpec {
    return {
      attrs: {
        language: {
          default: DEFAULT_LANGUAGE,
        },
      },
      content: "text*",
      marks: "",
      group: "block",
      code: true,
      defining: true,
      draggable: false,
      parseDOM: [
        { tag: "code" },
        { tag: "pre", preserveWhitespace: "full" },
        {
          tag: ".code-block",
          preserveWhitespace: "full",
          contentElement: "code",
          getAttrs: (dom: HTMLDivElement) => {
            return {
              language: dom.dataset.language,
            };
          },
        },
      ],
      toDOM: (node) => {
        const button = document.createElement("button");
        button.innerText = this.options.dictionary.copy;
        button.type = "button";
        button.addEventListener("click", this.handleCopyToClipboard);

        const select = document.createElement("select");
        select.addEventListener("change", this.handleLanguageChange);

        const actions = document.createElement("div");
        actions.className = "code-actions";
        actions.appendChild(select);
        actions.appendChild(button);

        this.languageOptions.forEach(([key, label]) => {
          const option = document.createElement("option");
          const value = key === "none" ? "" : key;
          option.value = value;
          option.innerText = label;
          option.selected = node.attrs.language === value;
          select.appendChild(option);
        });

        // For the Mermaid language we add an extra button to toggle between
        // source code and a rendered diagram view.
        if (node.attrs.language === "mermaidjs") {
          const showSourceButton = document.createElement("button");
          showSourceButton.innerText = this.options.dictionary.showSource;
          showSourceButton.type = "button";
          showSourceButton.classList.add("show-source-button");
          showSourceButton.addEventListener("click", this.handleToggleDiagram);
          actions.prepend(showSourceButton);

          const showDiagramButton = document.createElement("button");
          showDiagramButton.innerText = this.options.dictionary.showDiagram;
          showDiagramButton.type = "button";
          showDiagramButton.classList.add("show-digram-button");
          showDiagramButton.addEventListener("click", this.handleToggleDiagram);
          actions.prepend(showDiagramButton);
        }

        return [
          "div",
          {
            class: "code-block",
            "data-language": node.attrs.language,
          },
          ["div", { contentEditable: "false" }, actions],
          ["pre", ["code", { spellCheck: "false" }, 0]],
        ];
      },
    };
  }

  commands({ type, schema }: { type: NodeType; schema: Schema }) {
    return (attrs: Record<string, any>) =>
      toggleBlockType(type, schema.nodes.paragraph, {
        language: localStorage?.getItem(PERSISTENCE_KEY) || DEFAULT_LANGUAGE,
        ...attrs,
      });
  }

  keys({ type, schema }: { type: NodeType; schema: Schema }) {
    return {
      "Shift-Ctrl-\\": toggleBlockType(type, schema.nodes.paragraph),
      "Shift-Enter": (state: EditorState, dispatch: Dispatch) => {
        if (!isInCode(state)) {
          return false;
        }
        const {
          tr,
          selection,
        }: { tr: Transaction; selection: TextSelection } = state;
        const text = selection?.$anchor?.nodeBefore?.text;

        let newText = "\n";

        if (text) {
          const splitByNewLine = text.split("\n");
          const numOfSpaces = splitByNewLine[splitByNewLine.length - 1].search(
            /\S|$/
          );
          newText += " ".repeat(numOfSpaces);
        }

        dispatch(tr.insertText(newText, selection.from, selection.to));
        return true;
      },
      Tab: (state: EditorState, dispatch: Dispatch) => {
        if (!isInCode(state)) {
          return false;
        }

        const { tr, selection } = state;
        dispatch(tr.insertText("  ", selection.from, selection.to));
        return true;
      },
    };
  }

  handleCopyToClipboard = (event: MouseEvent) => {
    const { view } = this.editor;
    const element = event.target;
    if (!(element instanceof HTMLButtonElement)) {
      return;
    }
    const { top, left } = element.getBoundingClientRect();
    const result = view.posAtCoords({ top, left });

    if (result) {
      const node = view.state.doc.nodeAt(result.pos);
      if (node) {
        copy(node.textContent);
        this.options.onShowToast(this.options.dictionary.codeCopied);
      }
    }
  };

  handleLanguageChange = (event: InputEvent) => {
    const { view } = this.editor;
    const { tr } = view.state;
    const element = event.currentTarget;
    if (!(element instanceof HTMLSelectElement)) {
      return;
    }

    const { top, left } = element.getBoundingClientRect();
    const result = view.posAtCoords({ top, left });

    if (result) {
      const language = element.value;
      const transaction = tr
        .setSelection(Selection.near(view.state.doc.resolve(result.inside)))
        .setNodeMarkup(result.inside, undefined, {
          language,
        });

      view.dispatch(transaction);

      localStorage?.setItem(PERSISTENCE_KEY, language);
    }
  };

  handleToggleDiagram = (event: InputEvent) => {
    const { view } = this.editor;
    const { tr } = view.state;
    const element = event.currentTarget;
    if (!(element instanceof HTMLButtonElement)) {
      return;
    }

    const { top, left } = element.getBoundingClientRect();
    const result = view.posAtCoords({ top, left });

    if (!result) {
      return;
    }

    const diagramId = element
      .closest(".code-block")
      ?.getAttribute("data-diagram-id");
    if (!diagramId) {
      return;
    }

    const transaction = tr.setMeta("mermaid", { toggleDiagram: diagramId });
    view.dispatch(transaction);
  };

  get plugins() {
    return [
      Prism({ name: this.name }),
      Mermaid({ name: this.name }),
      new Plugin({
        key: new PluginKey("triple-click"),
        props: {
          handleDOMEvents: {
            mousedown(view, event) {
              const {
                selection: { $from, $to },
              } = view.state;
              if (!isInCode(view.state)) {
                return false;
              }
              return $from.sameParent($to) && event.detail === 3;
            },
          },
        },
      }),
    ];
  }

  inputRules({ type }: { type: NodeType }) {
    return [
      textblockTypeInputRule(/^```$/, type, () => ({
        language: localStorage?.getItem(PERSISTENCE_KEY) || DEFAULT_LANGUAGE,
      })),
    ];
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    state.write("```" + (node.attrs.language || "") + "\n");
    state.text(node.textContent, false);
    state.ensureNewLine();
    state.write("```");
    state.closeBlock(node);
  }

  get markdownToken() {
    return "fence";
  }

  parseMarkdown() {
    return {
      block: "code_block",
      getAttrs: (tok: Token) => ({ language: tok.info }),
    };
  }
}
