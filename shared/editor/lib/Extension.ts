import { PluginSimple } from "markdown-it";
import { InputRule } from "prosemirror-inputrules";
import { NodeType, MarkType, Schema } from "prosemirror-model";
import { Command, Plugin } from "prosemirror-state";
import { Primitive } from "utility-types";
import type { Editor } from "../../../app/editor";

export type CommandFactory = (attrs?: Record<string, Primitive>) => Command;

export type WidgetProps = { rtl: boolean; readOnly: boolean | undefined };

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

  get allowInReadOnly(): boolean {
    return false;
  }

  get focusAfterExecution(): boolean {
    return true;
  }

  /**
   * A widget is a React component to be rendered in the editor's context, independent of any
   * specific node or mark. It can be used to render things like toolbars, menus, etc. Note that
   * all widgets are observed automatically, so you can use observable values.
   *
   * @returns A React component
   */
  widget(_props: WidgetProps): React.ReactElement | undefined {
    return undefined;
  }

  /**
   * A map of ProseMirror keymap bindings. It can be used to bind keyboard shortcuts to commands.
   *
   * @returns An object mapping key bindings to commands
   */
  keys(_options: {
    type?: NodeType | MarkType;
    schema: Schema;
  }): Record<string, Command | CommandFactory> {
    return {};
  }

  /**
   * A map of ProseMirror input rules. It can be used to automatically replace certain patterns
   * while typing.
   *
   * @returns An array of input rules
   */
  inputRules(_options: {
    type?: NodeType | MarkType;
    schema: Schema;
  }): InputRule[] {
    return [];
  }

  /**
   * A map of ProseMirror commands. It can be used to expose commands to the editor. If a single
   * command is returned, it will be available under the extension's name.
   *
   * @returns An object mapping command names to command factories, or a command factory
   */
  commands(_options: {
    type?: NodeType | MarkType;
    schema: Schema;
  }): Record<string, CommandFactory> | CommandFactory | undefined {
    return {};
  }
}
