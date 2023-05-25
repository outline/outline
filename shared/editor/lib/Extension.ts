import { PluginSimple } from "markdown-it";
import { InputRule } from "prosemirror-inputrules";
import { NodeType, MarkType, Schema } from "prosemirror-model";
import { Command, Plugin } from "prosemirror-state";
import { Editor } from "../../../app/editor";

export type CommandFactory = (attrs?: Record<string, any>) => Command;

export default class Extension {
  options: any;
  editor: Editor;

  constructor(options: Record<string, any> = {}) {
    this.options = {
      ...this.defaultOptions,
      ...options,
    };
  }

  bindEditor(editor: Editor) {
    this.editor = editor;
  }

  get type() {
    return "extension";
  }

  get name() {
    return "";
  }

  get plugins(): Plugin[] {
    return [];
  }

  get rulePlugins(): PluginSimple[] {
    return [];
  }

  get defaultOptions() {
    return {};
  }

  keys(_options: {
    type?: NodeType | MarkType;
    schema: Schema;
  }): Record<string, Command> {
    return {};
  }

  inputRules(_options: {
    type?: NodeType | MarkType;
    schema: Schema;
  }): InputRule[] {
    return [];
  }

  commands(_options: {
    type?: NodeType | MarkType;
    schema: Schema;
  }): Record<string, CommandFactory> | CommandFactory | undefined {
    return {};
  }
}
