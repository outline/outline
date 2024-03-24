import copy from "copy-to-clipboard";
import Token from "markdown-it/lib/token";
import { exitCode } from "prosemirror-commands";
import { textblockTypeInputRule } from "prosemirror-inputrules";
import {
  NodeSpec,
  NodeType,
  Schema,
  Node as ProsemirrorNode,
} from "prosemirror-model";
import { Command, Plugin, PluginKey, TextSelection } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import refractor from "refractor/core";
import bash from "refractor/lang/bash";
import clike from "refractor/lang/clike";
import cpp from "refractor/lang/cpp";
import csharp from "refractor/lang/csharp";
import css from "refractor/lang/css";
import elixir from "refractor/lang/elixir";
import erlang from "refractor/lang/erlang";
import go from "refractor/lang/go";
import graphql from "refractor/lang/graphql";
import groovy from "refractor/lang/groovy";
import haskell from "refractor/lang/haskell";
import hcl from "refractor/lang/hcl";
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
import sass from "refractor/lang/sass";
import scala from "refractor/lang/scala";
import scss from "refractor/lang/scss";
import solidity from "refractor/lang/solidity";
import sql from "refractor/lang/sql";
import swift from "refractor/lang/swift";
import toml from "refractor/lang/toml";
import tsx from "refractor/lang/tsx";
import typescript from "refractor/lang/typescript";
import verilog from "refractor/lang/verilog";
import vhdl from "refractor/lang/vhdl";
import visualbasic from "refractor/lang/visual-basic";
import yaml from "refractor/lang/yaml";
import zig from "refractor/lang/zig";

import { toast } from "sonner";
import { Primitive } from "utility-types";
import type { Dictionary } from "~/hooks/useDictionary";
import { UserPreferences } from "../../types";
import Storage from "../../utils/Storage";
import { isMac } from "../../utils/browser";
import backspaceToParagraph from "../commands/backspaceToParagraph";
import {
  newlineInCode,
  insertSpaceTab,
  moveToNextNewline,
  moveToPreviousNewline,
} from "../commands/codeFence";
import { selectAll } from "../commands/selectAll";
import toggleBlockType from "../commands/toggleBlockType";
import Kroki from "../extensions/Kroki";
import Mermaid from "../extensions/Mermaid";
import Prism from "../extensions/Prism";
import { isCode } from "../lib/isCode";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import { findParentNode } from "../queries/findParentNode";
import getMarkRange from "../queries/getMarkRange";
import isInCode from "../queries/isInCode";
import Node from "./Node";

const PERSISTENCE_KEY = "rme-code-language";
const DEFAULT_LANGUAGE = "javascript";

[
  bash,
  cpp,
  css,
  clike,
  csharp,
  elixir,
  erlang,
  go,
  graphql,
  groovy,
  haskell,
  hcl,
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
  sass,
  scss,
  swift,
  toml,
  typescript,
  tsx,
  verilog,
  vhdl,
  visualbasic,
  yaml,
  zig,
].forEach(refractor.register);

export default class CodeFence extends Node {
  constructor(options: {
    dictionary: Dictionary;
    userPreferences?: UserPreferences | null;
  }) {
    super(options);
  }

  get showLineNumbers(): boolean {
    return this.options.userPreferences?.codeBlockLineNumbers ?? true;
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
        diagram: {
          default: null,
        },
      },
      content: "text*",
      marks: "comment",
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
          contentElement: (node: HTMLElement) =>
            node.querySelector("code") || node,
          getAttrs: (dom: HTMLDivElement) => ({
            language: dom.dataset.language,
          }),
        },
      ],
      toDOM: (node) => [
        "div",
        {
          class: `code-block ${
            this.showLineNumbers ? "with-line-numbers" : ""
          }`,
          "data-language": node.attrs.language,
        },
        ["pre", ["code", { spellCheck: "false" }, 0]],
      ],
    };
  }

  commands({ type, schema }: { type: NodeType; schema: Schema }) {
    return {
      code_block: (attrs: Record<string, Primitive>) => {
        if (attrs?.language) {
          if (attrs.language !== "kroki") {
            Storage.set(PERSISTENCE_KEY, attrs.language);
          }
        }
        return toggleBlockType(type, schema.nodes.paragraph, {
          language: Storage.get(PERSISTENCE_KEY, DEFAULT_LANGUAGE),
          ...attrs,
        });
      },
      copyToClipboard: (): Command => (state, dispatch) => {
        const codeBlock = findParentNode(isCode)(state.selection);

        if (codeBlock) {
          copy(codeBlock.node.textContent);
          toast.message(this.options.dictionary.codeCopied);
          return true;
        }

        const { doc, tr } = state;
        const range =
          getMarkRange(
            doc.resolve(state.selection.from),
            this.editor.schema.marks.code_inline
          ) ||
          getMarkRange(
            doc.resolve(state.selection.to),
            this.editor.schema.marks.code_inline
          );

        if (range) {
          const $end = doc.resolve(range.to);
          tr.setSelection(new TextSelection($end, $end));
          dispatch?.(tr);

          copy(tr.doc.textBetween(state.selection.from, state.selection.to));
          toast.message(this.options.dictionary.codeCopied);
          return true;
        }

        return false;
      },
    };
  }

  get allowInReadOnly() {
    return true;
  }

  keys({ type, schema }: { type: NodeType; schema: Schema }) {
    const output: Record<string, Command> = {
      "Shift-Ctrl-\\": toggleBlockType(type, schema.nodes.paragraph),
      Tab: insertSpaceTab,
      Enter: (state, dispatch) => {
        if (!isInCode(state)) {
          return false;
        }
        const { selection } = state;
        const text = selection.$anchor.nodeBefore?.text;
        const selectionAtEnd =
          selection.$anchor.parentOffset ===
          selection.$anchor.parent.nodeSize - 2;

        if (selectionAtEnd && text?.endsWith("\n")) {
          exitCode(state, dispatch);
          return true;
        }

        return newlineInCode(state, dispatch);
      },
      Backspace: backspaceToParagraph(type),
      "Shift-Enter": newlineInCode,
      "Mod-a": selectAll(type),
    };

    if (isMac()) {
      return {
        ...output,
        "Ctrl-a": moveToPreviousNewline,
        "Ctrl-e": moveToNextNewline,
      };
    }

    return output;
  }

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
      Kroki({
        name: this.name,
        url: "https://kroki.io",
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
      new Plugin({
        props: {
          decorations(state) {
            const codeBlock = findParentNode(isCode)(state.selection);

            if (!codeBlock) {
              return null;
            }

            const decoration = Decoration.node(
              codeBlock.pos,
              codeBlock.pos + codeBlock.node.nodeSize,
              { class: "code-active" }
            );
            return DecorationSet.create(state.doc, [decoration]);
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
