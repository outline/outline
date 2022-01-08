import { PluginSimple } from "markdown-it";
import { InputRule } from "prosemirror-inputrules";
import { NodeType, Schema } from "prosemirror-model";
import { EditorState, Plugin, Transaction } from "prosemirror-state";
import Editor from "../";

export type Command = (
  attrs: any
) => (state: EditorState, dispatch: (tr: Transaction) => void) => any;

export interface ExtensionInterface {
  name: string;

  type: string;

  plugins: Plugin[];

  rulePlugins: PluginSimple[];

  keys: (options: {
    type?: NodeType;
    schema: Schema;
  }) => { [key: string]: Command };

  inputRules: (options: { type?: NodeType; schema: Schema }) => InputRule[];

  commands: (options: {
    type?: NodeType;
    schema: Schema;
  }) => Record<string, Command> | Command;
}

export default class Extension implements ExtensionInterface {
  options: Record<string, any>;
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

  keys(_: { schema: Schema }) {
    return {};
  }

  inputRules(_: { schema: Schema }) {
    return [];
  }

  commands(_: { schema: Schema }) {
    return {};
  }
}
