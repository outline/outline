import type { Options, PluginSimple } from "markdown-it";
import { observer } from "mobx-react";
import { keymap } from "prosemirror-keymap";
import { MarkdownParser, type ParseSpec } from "prosemirror-markdown";
import type { MarkSpec, NodeSpec, Schema } from "prosemirror-model";
import type { EditorView } from "prosemirror-view";
import type { Primitive } from "utility-types";
import type { Editor } from "~/editor";
import type Mark from "../marks/Mark";
import type Node from "../nodes/Node";
import type { CommandFactory } from "./Extension";
import type Extension from "./Extension";
import makeRules from "./markdown/rules";
import { MarkdownSerializer } from "./markdown/serializer";

export default class ExtensionManager {
  extensions: (Node | Mark | Extension)[] = [];
  readOnly: boolean;

  constructor(
    extensions: (
      | Extension
      | typeof Node
      | typeof Mark
      | typeof Extension
    )[] = [],
    editor?: Editor
  ) {
    this.readOnly = editor?.props.readOnly ?? false;

    extensions.forEach((ext) => {
      let extension;

      if (typeof ext === "function") {
        // Check the prototype before instantiation to avoid constructor cost
        // for extensions not needed in read-only mode.
        if (
          this.readOnly &&
          ext.prototype.type === "extension" &&
          !ext.prototype.allowInReadOnly
        ) {
          return;
        }

        // @ts-expect-error We won't instantiate an abstract class
        extension = new ext(editor?.props);
      } else {
        // For already-instantiated extensions, check the instance.
        if (this.readOnly && ext.type === "extension" && !ext.allowInReadOnly) {
          return;
        }

        extension = ext;
      }

      if (editor) {
        extension.bindEditor(editor);
      }

      this.extensions.push(extension);
    });
  }

  get widgets() {
    return Object.fromEntries(
      this.extensions
        .filter((extension) =>
          extension.widget({ rtl: false, readOnly: false })
        )
        .map((node: Node) => [node.name, observer(node.widget as any)])
    );
  }

  get nodes() {
    const nodes: Record<string, NodeSpec> = Object.fromEntries(
      this.extensions
        .filter((extension) => extension.type === "node")
        .map((node: Node) => [node.name, node.schema])
    );

    for (const i in nodes) {
      const { marks } = nodes[i];
      if (marks) {
        // We must filter marks from the marks list that are not defined
        // in the schema for the current editor.
        nodes[i].marks = marks
          .split(" ")
          .filter((m: string) => Object.keys(this.marks).includes(m))
          .join(" ");
      }
    }

    return nodes;
  }

  get marks() {
    const marks: Record<string, MarkSpec> = Object.fromEntries(
      this.extensions
        .filter((extension) => extension.type === "mark")
        .map((mark: Mark) => [mark.name, mark.schema])
    );

    for (const i in marks) {
      const { excludes } = marks[i];
      if (excludes) {
        // We must filter marks from the excludes list that are not defined
        // in the schema for the current editor.
        marks[i].excludes = excludes
          .split(" ")
          .filter((m: string) => Object.keys(marks).includes(m))
          .join(" ");
      }
    }

    return marks;
  }

  serializer() {
    const nodes = Object.fromEntries(
      this.extensions
        .filter((extension) => extension.type === "node")
        .map((extension: Node) => [extension.name, extension.toMarkdown])
    );

    const marks = Object.fromEntries(
      this.extensions
        .filter((extension) => extension.type === "mark")
        .map((extension: Mark) => [extension.name, extension.toMarkdown])
    );

    return new MarkdownSerializer(nodes, marks);
  }

  parser({
    schema,
    rules,
    plugins,
  }: {
    schema: Schema;
    rules?: Options;
    plugins?: PluginSimple[];
  }): MarkdownParser {
    const tokens: Record<string, ParseSpec> = {};
    for (const extension of this.extensions) {
      if (extension.type !== "mark" && extension.type !== "node") {
        continue;
      }
      const node = extension as Node | Mark;
      const parseSpec = node.parseMarkdown();
      if (!parseSpec) {
        continue;
      }
      tokens[node.markdownToken || node.name] = parseSpec;
    }

    return new MarkdownParser(
      schema,
      makeRules({ rules, schema, plugins }),
      tokens
    );
  }

  get plugins() {
    return this.extensions
      .filter((extension) => "plugins" in extension)
      .reduce((allPlugins, { plugins }) => [...allPlugins, ...plugins], []);
  }

  get rulePlugins() {
    return this.extensions
      .filter((extension) => "rulePlugins" in extension)
      .reduce(
        (allRulePlugins, { rulePlugins }) => [
          ...allRulePlugins,
          ...rulePlugins,
        ],
        []
      );
  }

  keymaps({ schema }: { schema: Schema }) {
    const keymaps = this.extensions
      .filter((extension) => extension.keys)
      .map((extension) =>
        ["node", "mark"].includes(extension.type)
          ? extension.keys({
              // @ts-expect-error TODO
              type: schema[`${extension.type}s`][extension.name],
              schema,
            })
          : (extension as Extension).keys({ schema })
      );

    return keymaps.map(keymap);
  }

  inputRules({ schema }: { schema: Schema }) {
    const extensionInputRules = this.extensions
      .filter((extension) => ["extension"].includes(extension.type))
      .filter((extension) => extension.inputRules)
      .map((extension: Extension) => extension.inputRules({ schema }));

    const nodeMarkInputRules = this.extensions
      .filter((extension) => ["node", "mark"].includes(extension.type))
      .filter((extension) => extension.inputRules)
      .map((extension) =>
        extension.inputRules({
          // @ts-expect-error TODO
          type: schema[`${extension.type}s`][extension.name],
          schema,
        })
      );

    return [...extensionInputRules, ...nodeMarkInputRules].reduce(
      (allInputRules, inputRules) => [...allInputRules, ...inputRules],
      []
    );
  }

  commands({ schema, view }: { schema: Schema; view: EditorView }) {
    return this.extensions
      .filter((extension) => extension.commands)
      .reduce((allCommands, extension) => {
        const { name, type } = extension;
        const commands: Record<string, CommandFactory> = {};

        // @ts-expect-error FIXME
        const value = extension.commands({
          schema,
          ...(["node", "mark"].includes(type)
            ? {
                // @ts-expect-error TODO
                type: schema[`${type}s`][name],
              }
            : {}),
        });

        const apply = (
          callback: CommandFactory,
          attrs: Record<string, Primitive>
        ) => {
          if (!view.editable && !extension.allowInReadOnly) {
            return;
          }
          if (extension.focusAfterExecution) {
            view.focus();
          }
          return callback(attrs)?.(view.state, view.dispatch, view);
        };

        const handle = (_name: string, _value: CommandFactory) => {
          const values: CommandFactory[] = Array.isArray(_value)
            ? _value
            : [_value];

          // @ts-expect-error FIXME
          commands[_name] = (attrs: Record<string, Primitive>) =>
            values.forEach((callback) => apply(callback, attrs));
        };

        if (typeof value === "object") {
          Object.entries(value).forEach(([commandName, commandValue]) => {
            handle(commandName, commandValue);
          });
        } else if (value) {
          handle(name, value);
        }

        return {
          ...allCommands,
          ...commands,
        };
      }, {});
  }
}
