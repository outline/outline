import copy from "copy-to-clipboard";
import { Token } from "markdown-it";
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
import docker from "refractor/lang/docker";
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
// @ts-expect-error type definition is missing, but package exists
import mermaid from "refractor/lang/mermaid";
import nginx from "refractor/lang/nginx";
import nix from "refractor/lang/nix";
import objectivec from "refractor/lang/objectivec";
import ocaml from "refractor/lang/ocaml";
import perl from "refractor/lang/perl";
import php from "refractor/lang/php";
import powershell from "refractor/lang/powershell";
import protobuf from "refractor/lang/protobuf";
import python from "refractor/lang/python";
import r from "refractor/lang/r";
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
import { isMac } from "../../utils/browser";
import backspaceToParagraph from "../commands/backspaceToParagraph";
import {
  newlineInCode,
  indentInCode,
  moveToNextNewline,
  moveToPreviousNewline,
  outdentInCode,
  enterInCode,
} from "../commands/codeFence";
import { selectAll } from "../commands/selectAll";
import toggleBlockType from "../commands/toggleBlockType";
import Mermaid from "../extensions/Mermaid";
import Prism from "../extensions/Prism";
import { getRecentCodeLanguage, setRecentCodeLanguage } from "../lib/code";
import { isCode } from "../lib/isCode";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import { findNextNewline, findPreviousNewline } from "../queries/findNewlines";
import { findParentNode } from "../queries/findParentNode";
import { getMarkRange } from "../queries/getMarkRange";
import { isInCode } from "../queries/isInCode";
import Node from "./Node";

const DEFAULT_LANGUAGE = "javascript";

[
  bash,
  cpp,
  css,
  clike,
  csharp,
  docker,
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
  mermaid,
  nginx,
  nix,
  objectivec,
  ocaml,
  perl,
  php,
  python,
  powershell,
  protobuf,
  r,
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
          validate: "string",
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
          setRecentCodeLanguage(attrs.language as string);
        }
        return toggleBlockType(type, schema.nodes.paragraph, {
          language: getRecentCodeLanguage() ?? DEFAULT_LANGUAGE,
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
      // Both shortcuts work, but Shift-Ctrl-c matches the one in the menu
      "Shift-Ctrl-c": toggleBlockType(type, schema.nodes.paragraph),
      "Shift-Ctrl-\\": toggleBlockType(type, schema.nodes.paragraph),
      "Shift-Tab": outdentInCode,
      Tab: indentInCode,
      Enter: enterInCode,
      Backspace: backspaceToParagraph(type),
      "Shift-Enter": newlineInCode,
      "Mod-a": selectAll(type),
      "Mod-]": indentInCode,
      "Mod-[": outdentInCode,
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
      new Plugin({
        key: new PluginKey("triple-click"),
        props: {
          handleDOMEvents: {
            mousedown(view, event) {
              const { dispatch, state } = view;
              const {
                selection: { $from, $to },
              } = state;
              if (
                $from.sameParent($to) &&
                event.detail === 3 &&
                isInCode(view.state, { onlyBlock: true })
              ) {
                dispatch?.(
                  state.tr
                    .setSelection(
                      TextSelection.create(
                        state.doc,
                        findPreviousNewline($from),
                        findNextNewline($from)
                      )
                    )
                    .scrollIntoView()
                );

                event.preventDefault();
                return true;
              }

              return false;
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
        language: getRecentCodeLanguage() ?? DEFAULT_LANGUAGE,
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
