import { toggleMark } from "prosemirror-commands";
import {
  MarkSpec,
  MarkType,
  Node as ProsemirrorNode,
  Mark as ProsemirrorMark,
} from "prosemirror-model";
import moveLeft from "../commands/moveLeft";
import moveRight from "../commands/moveRight";
import markInputRule from "../lib/markInputRule";
import { MarkdownSerializerState } from "../lib/markdown/serializer";
import Mark from "./Mark";

function backticksFor(node: ProsemirrorNode, side: -1 | 1) {
  const ticks = /`+/g;
  let match: RegExpMatchArray | null;
  let len = 0;

  if (node.isText) {
    while ((match = ticks.exec(node.text || ""))) {
      len = Math.max(len, match[0].length);
    }
  }

  let result = len > 0 && side > 0 ? " `" : "`";
  for (let i = 0; i < len; i++) {
    result += "`";
  }
  if (len > 0 && side < 0) {
    result += " ";
  }
  return result;
}

export default class Code extends Mark {
  get name() {
    return "code_inline";
  }

  get schema(): MarkSpec {
    return {
      excludes: "_",
      parseDOM: [{ tag: "code.inline", preserveWhitespace: true }],
      toDOM: () => ["code", { class: "inline", spellCheck: "false" }],
    };
  }

  inputRules({ type }: { type: MarkType }) {
    return [markInputRule(/(?:^|[^`])(`([^`]+)`)$/, type)];
  }

  keys({ type }: { type: MarkType }) {
    // Note: This key binding only works on non-Mac platforms
    // https://github.com/ProseMirror/prosemirror/issues/515
    return {
      "Mod`": toggleMark(type),
      ArrowLeft: moveLeft(),
      ArrowRight: moveRight(),
    };
  }

  toMarkdown() {
    return {
      open(
        _state: MarkdownSerializerState,
        _mark: ProsemirrorMark,
        parent: ProsemirrorNode,
        index: number
      ) {
        return backticksFor(parent.child(index), -1);
      },
      close(
        _state: MarkdownSerializerState,
        _mark: ProsemirrorMark,
        parent: ProsemirrorNode,
        index: number
      ) {
        return backticksFor(parent.child(index - 1), 1);
      },
      escape: false,
    };
  }

  parseMarkdown() {
    return { mark: "code_inline" };
  }
}
