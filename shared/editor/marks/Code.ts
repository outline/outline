import { toggleMark } from "prosemirror-commands";
import markInputRule from "../lib/markInputRule";
import moveLeft from "../commands/moveLeft";
import moveRight from "../commands/moveRight";
import Mark from "./Mark";

function backticksFor(node, side) {
  const ticks = /`+/g;
  let match: RegExpMatchArray | null;
  let len = 0;

  if (node.isText) {
    while ((match = ticks.exec(node.text))) {
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

  get schema() {
    return {
      excludes: "_",
      parseDOM: [{ tag: "code", preserveWhitespace: true }],
      toDOM: () => ["code", { spellCheck: false }],
    };
  }

  inputRules({ type }) {
    return [markInputRule(/(?:^|[^`])(`([^`]+)`)$/, type)];
  }

  keys({ type }) {
    // Note: This key binding only works on non-Mac platforms
    // https://github.com/ProseMirror/prosemirror/issues/515
    return {
      "Mod`": toggleMark(type),
      ArrowLeft: moveLeft(),
      ArrowRight: moveRight(),
    };
  }

  get toMarkdown() {
    return {
      open(_state, _mark, parent, index) {
        return backticksFor(parent.child(index), -1);
      },
      close(_state, _mark, parent, index) {
        return backticksFor(parent.child(index - 1), 1);
      },
      escape: false,
    };
  }

  parseMarkdown() {
    return { mark: "code_inline" };
  }
}
