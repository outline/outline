import { InputRule } from "prosemirror-inputrules";
import { ParseSpec } from "prosemirror-markdown";
import {
  MarkSpec,
  MarkType,
  Node as ProsemirrorNode,
  Schema,
} from "prosemirror-model";
import { Command } from "prosemirror-state";
import { toggleMark } from "../commands/toggleMark";
import Extension, { CommandFactory } from "../lib/Extension";
import { MarkdownSerializerState } from "../lib/markdown/serializer";

export default abstract class Mark extends Extension {
  get type() {
    return "mark";
  }

  get schema(): MarkSpec {
    return {};
  }

  get markdownToken(): string {
    return "";
  }

  keys(_options: { type: MarkType; schema: Schema }): Record<string, Command> {
    return {};
  }

  inputRules(_options: { type: MarkType; schema: Schema }): InputRule[] {
    return [];
  }

  toMarkdown(_state: MarkdownSerializerState, _node: ProsemirrorNode) {
    throw new Error("toMarkdown not implemented");
  }

  parseMarkdown(): ParseSpec | void {
    return undefined;
  }

  commands({
    type,
  }: {
    type: MarkType;
    schema: Schema;
  }): Record<string, CommandFactory> | CommandFactory | undefined {
    return (attrs) => toggleMark(type, attrs);
  }
}
