import copy from "copy-to-clipboard";
import Token from "markdown-it/lib/token";
import { textblockTypeInputRule } from "prosemirror-inputrules";
import {
  NodeSpec,
  NodeType,
  Schema,
  Node as ProsemirrorNode,
} from "prosemirror-model";
import { Selection, Plugin, PluginKey } from "prosemirror-state";
import refractor from "refractor/core";
import bash from "refractor/lang/bash";
import clike from "refractor/lang/clike";
import csharp from "refractor/lang/csharp";
import css from "refractor/lang/css";
import elixir from "refractor/lang/elixir";
import erlang from "refractor/lang/erlang";
import go from "refractor/lang/go";
import graphql from "refractor/lang/graphql";
import groovy from "refractor/lang/groovy";
import haskell from "refractor/lang/haskell";
import ini from "refractor/lang/ini";
import java from "refractor/lang/java";
import javascript from "refractor/lang/javascript";
import json from "refractor/lang/json";
import jsx from "refractor/lang/jsx";
import kotlin from "refractor/lang/kotlin";
import lisp from "refractor/lang/lisp";
import lua from "refractor/lang/lua";
import markup from "refractor/lang/markup";
import nix from "refractor/lang/nix";
import objectivec from "refractor/lang/objectivec";
import ocaml from "refractor/lang/ocaml";
import perl from "refractor/lang/perl";
import php from "refractor/lang/php";
import powershell from "refractor/lang/powershell";
import python from "refractor/lang/python";
import ruby from "refractor/lang/ruby";
import rust from "refractor/lang/rust";
import scala from "refractor/lang/scala";
import solidity from "refractor/lang/solidity";
import sql from "refractor/lang/sql";
import swift from "refractor/lang/swift";
import toml from "refractor/lang/toml";
import tsx from "refractor/lang/tsx";
import typescript from "refractor/lang/typescript";
import visualbasic from "refractor/lang/visual-basic";
import yaml from "refractor/lang/yaml";
import zig from "refractor/lang/zig";

import { Dictionary } from "~/hooks/useDictionary";
import { UserPreferences } from "../../types";
import Storage from "../../utils/Storage";
import {
  newlineInCode,
  insertSpaceTab,
  moveToNextNewline,
  moveToPreviousNewline,
} from "../commands/codeFence";
import toggleBlockType from "../commands/toggleBlockType";
import Mermaid from "../extensions/Mermaid";
import Prism, { LANGUAGES } from "../extensions/Prism";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import isInCode from "../queries/isInCode";
import Node from "./Node";

const PERSISTENCE_KEY = "rme-code-language";
const DEFAULT_LANGUAGE = "javascript";

[
  bash,
  css,
  clike,
  csharp,
  elixir,
  erlang,
  go,
  graphql,
  groovy,
  haskell,
  ini,
  java,
  javascript,
  jsx,
  json,
  kotlin,
  lisp,
  lua,
  markup,
  nix,
  objectivec,
  ocaml,
  perl,
  php,
  python,
  powershell,
  ruby,
  rust,
  scala,
  sql,
  solidity,
  swift,
  toml,
  typescript,
  tsx,
  visualbasic,
  yaml,
  zig,
].forEach(refractor.register);

export default class CodeFence extends Node {
  constructor(options: {
    dictionary: Dictionary;
    userPreferences?: UserPreferences | null;
    onShowToast: (message: string) => void;
  }) {
    super(options);
  }

  get showLineNumbers(): boolean {
    return this.options.userPreferences?.codeBlockLineNumbers ?? true;
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
          getAttrs: (dom: HTMLDivElement) => ({
            language: dom.dataset.language,
          }),
        },
      ],
      toDOM: (node) => {
        let actions;
        if (typeof document !== "undefined") {
          const button = document.createElement("button");
          button.innerText = this.options.dictionary.copy;
          button.type = "button";
          button.addEventListener("click", this.handleCopyToClipboard);

          const select = document.createElement("select");
          select.addEventListener("change", this.handleLanguageChange);

          actions = document.createElement("div");
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
            showSourceButton.addEventListener(
              "click",
              this.handleToggleDiagram
            );
            actions.prepend(showSourceButton);

            const showDiagramButton = document.createElement("button");
            showDiagramButton.innerText = this.options.dictionary.showDiagram;
            showDiagramButton.type = "button";
            showDiagramButton.classList.add("show-digram-button");
            showDiagramButton.addEventListener(
              "click",
              this.handleToggleDiagram
            );
            actions.prepend(showDiagramButton);
          }
        }

        return [
          "div",
          {
            class: `code-block ${
              this.showLineNumbers ? "with-line-numbers" : ""
            }`,
            "data-language": node.attrs.language,
          },
          ...(actions ? [["div", { contentEditable: "false" }, actions]] : []),
          ["pre", ["code", { spellCheck: "false" }, 0]],
        ];
      },
    };
  }

  commands({ type, schema }: { type: NodeType; schema: Schema }) {
    return (attrs: Record<string, any>) =>
      toggleBlockType(type, schema.nodes.paragraph, {
        language: Storage.get(PERSISTENCE_KEY, DEFAULT_LANGUAGE),
        ...attrs,
      });
  }

  keys({ type, schema }: { type: NodeType; schema: Schema }) {
    return {
      "Shift-Ctrl-\\": toggleBlockType(type, schema.nodes.paragraph),
      Tab: insertSpaceTab,
      Enter: newlineInCode,
      "Shift-Enter": newlineInCode,
      "Ctrl-a": moveToPreviousNewline,
      "Ctrl-e": moveToNextNewline,
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

      Storage.set(PERSISTENCE_KEY, language);
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
      Prism({
        name: this.name,
        lineNumbers: this.showLineNumbers,
      }),
      Mermaid({
        name: this.name,
        isDark: this.editor.props.theme.isDark,
      }),
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
        language: Storage.get(PERSISTENCE_KEY, DEFAULT_LANGUAGE),
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
