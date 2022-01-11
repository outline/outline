import { PluginSimple } from "markdown-it";
import { keymap } from "prosemirror-keymap";
import { MarkdownParser, TokenConfig } from "prosemirror-markdown";
import { Schema } from "prosemirror-model";
import { EditorView } from "prosemirror-view";
import Editor from "../";
import Mark from "../marks/Mark";
import Node from "../nodes/Node";
import Extension from "./Extension";
import makeRules from "./markdown/rules";
import { MarkdownSerializer } from "./markdown/serializer";

export default class ExtensionManager {
  extensions: (Node | Mark | Extension)[];

  constructor(extensions: (Node | Mark | Extension)[] = [], editor?: Editor) {
    if (editor) {
      extensions.forEach((extension) => {
        extension.bindEditor(editor);
      });
    }

    this.extensions = extensions;
  }

  get nodes() {
    return this.extensions
      .filter((extension) => extension.type === "node")
      .reduce(
        (nodes, node: Node) => ({
          ...nodes,
          [node.name]: node.schema,
        }),
        {}
      );
  }

  serializer() {
    const nodes = this.extensions
      .filter((extension) => extension.type === "node")
      .reduce(
        (nodes, extension: Node) => ({
          ...nodes,
          [extension.name]: extension.toMarkdown,
        }),
        {}
      );

    const marks = this.extensions
      .filter((extension) => extension.type === "mark")
      .reduce(
        (marks, extension: Mark) => ({
          ...marks,
          [extension.name]: extension.toMarkdown,
        }),
        {}
      );

    return new MarkdownSerializer(nodes, marks);
  }

  parser({
    schema,
    rules,
    plugins,
  }: {
    schema: Schema;
    rules?: Record<string, any>;
    plugins?: PluginSimple[];
  }): MarkdownParser {
    const tokens: Record<string, TokenConfig> = this.extensions
      .filter(
        (extension) => extension.type === "mark" || extension.type === "node"
      )
      .reduce((nodes, extension: Node | Mark) => {
        const md = extension.parseMarkdown();
        if (!md) return nodes;

        return {
          ...nodes,
          [extension.markdownToken || extension.name]: md,
        };
      }, {});

    return new MarkdownParser(schema, makeRules({ rules, plugins }), tokens);
  }

  get marks() {
    return this.extensions
      .filter((extension) => extension.type === "mark")
      .reduce(
        (marks, { name, schema }: Mark) => ({
          ...marks,
          [name]: schema,
        }),
        {}
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
    const extensionKeymaps = this.extensions
      .filter((extension) => ["extension"].includes(extension.type))
      .filter((extension) => extension.keys)
      .map((extension: Extension) => extension.keys({ schema }));

    const nodeKeymaps = this.extensions
      .filter((extension) => ["node", "mark"].includes(extension.type))
      .filter((extension) => extension.keys)
      .map((extension: Node | Mark) =>
        extension.keys({
          type: schema[`${extension.type}s`][extension.name],
          schema,
        })
      );

    return [
      ...extensionKeymaps,
      ...nodeKeymaps,
    ].map((keys: Record<string, any>) => keymap(keys));
  }

  inputRules({ schema }: { schema: Schema }) {
    const extensionInputRules = this.extensions
      .filter((extension) => ["extension"].includes(extension.type))
      .filter((extension) => extension.inputRules)
      .map((extension) => extension.inputRules({ schema }));

    const nodeMarkInputRules = this.extensions
      .filter((extension) => ["node", "mark"].includes(extension.type))
      .filter((extension) => extension.inputRules)
      .map((extension) =>
        extension.inputRules({
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
        const commands = {};
        const value = extension.commands({
          schema,
          ...(["node", "mark"].includes(type)
            ? {
                type: schema[`${type}s`][name],
              }
            : {}),
        });

        const apply = (callback, attrs) => {
          if (!view.editable) {
            return false;
          }
          view.focus();
          return callback(attrs)(view.state, view.dispatch, view);
        };

        const handle = (_name, _value) => {
          if (Array.isArray(_value)) {
            commands[_name] = (attrs) =>
              _value.forEach((callback) => apply(callback, attrs));
          } else if (typeof _value === "function") {
            commands[_name] = (attrs) => apply(_value, attrs);
          }
        };

        if (typeof value === "object") {
          Object.entries(value).forEach(([commandName, commandValue]) => {
            handle(commandName, commandValue);
          });
        } else {
          handle(name, value);
        }

        return {
          ...allCommands,
          ...commands,
        };
      }, {});
  }
}
