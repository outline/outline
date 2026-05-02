import type { Options, PluginSimple } from "markdown-it";
import { observer } from "mobx-react";
import { keymap } from "prosemirror-keymap";
import { MarkdownParser } from "prosemirror-markdown";
import type { MarkSpec, NodeSpec, Schema } from "prosemirror-model";
import type { EditorView } from "prosemirror-view";
import type { Primitive } from "utility-types";
import type { Editor } from "~/editor";
import type Mark from "../marks/Mark";
import type Node from "../nodes/Node";
import type { CommandFactory, WidgetProps } from "./Extension";
import type Extension from "./Extension";
import type { AnyExtension, AnyExtensionClass } from "./types";
import makeRules from "./markdown/rules";
import { MarkdownSerializer } from "./markdown/serializer";

export default class ExtensionManager {
  extensions: AnyExtension[] = [];
  readOnly: boolean;

  constructor(
    extensions: (AnyExtensionClass | AnyExtension)[] = [],
    editor?: Editor
  ) {
    this.readOnly = editor?.props.readOnly ?? false;

    extensions.forEach((ext) => {
      let extension: AnyExtension;

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

        // Cast away abstract: registration treats all classes uniformly and
        // concrete subclasses are required at the public boundary.
        const Ctor = ext as new (
          options?: Record<string, unknown>
        ) => AnyExtension;
        extension = new Ctor(editor?.props);
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
    return this.extensions
      .filter((extension) => extension.widget({ rtl: false, readOnly: false }))
      .reduce(
        (memo, node: Node) => ({
          ...memo,
          [node.name]: observer(((props: WidgetProps) =>
            node.widget(props)) as React.FC<WidgetProps>),
        }),
        {}
      );
  }

  get nodes() {
    const nodes: Record<string, NodeSpec> = this.extensions
      .filter((extension) => extension.type === "node")
      .reduce(
        (memo, node: Node) => ({
          ...memo,
          [node.name]: node.schema,
        }),
        {}
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
    const marks: Record<string, MarkSpec> = this.extensions
      .filter((extension) => extension.type === "mark")
      .reduce(
        (memo, mark: Mark) => ({
          ...memo,
          [mark.name]: mark.schema,
        }),
        {}
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
    const nodes = this.extensions
      .filter((extension) => extension.type === "node")
      .reduce(
        (memo, extension: Node) => ({
          ...memo,
          [extension.name]: (...args: Parameters<Node["toMarkdown"]>) =>
            extension.toMarkdown(...args),
        }),
        {}
      );

    const marks = this.extensions
      .filter((extension) => extension.type === "mark")
      .reduce(
        (memo, extension: Mark) => ({
          ...memo,
          [extension.name]: (...args: Parameters<Mark["toMarkdown"]>) =>
            extension.toMarkdown(...args),
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
    rules?: Options;
    plugins?: PluginSimple[];
  }): MarkdownParser {
    const tokens = this.extensions
      .filter(
        (extension) => extension.type === "mark" || extension.type === "node"
      )
      .reduce((nodes, extension: Node | Mark) => {
        const parseSpec = extension.parseMarkdown();
        if (!parseSpec) {
          return nodes;
        }

        return {
          ...nodes,
          [extension.markdownToken || extension.name]: parseSpec,
        };
      }, {});

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
      .map((extension) => {
        if (extension.type === "node") {
          const node = extension as Node;
          return node.keys({ type: schema.nodes[node.name], schema });
        }
        if (extension.type === "mark") {
          const mark = extension as Mark;
          return mark.keys({ type: schema.marks[mark.name], schema });
        }
        return (extension as Extension).keys({ schema });
      });

    return keymaps.map(keymap);
  }

  inputRules({ schema }: { schema: Schema }) {
    const extensionInputRules = this.extensions
      .filter((extension) => extension.type === "extension")
      .filter((extension) => extension.inputRules)
      .map((extension: Extension) => extension.inputRules({ schema }));

    const nodeMarkInputRules = this.extensions
      .filter(
        (extension) => extension.type === "node" || extension.type === "mark"
      )
      .filter((extension) => extension.inputRules)
      .map((extension) => {
        if (extension.type === "node") {
          const node = extension as Node;
          return node.inputRules({ type: schema.nodes[node.name], schema });
        }
        const mark = extension as Mark;
        return mark.inputRules({ type: schema.marks[mark.name], schema });
      });

    return [...extensionInputRules, ...nodeMarkInputRules].reduce(
      (allInputRules, inputRules) => [...allInputRules, ...inputRules],
      []
    );
  }

  commands({ schema, view }: { schema: Schema; view: EditorView }) {
    return this.extensions
      .filter((extension) => extension.commands)
      .reduce((allCommands, extension) => {
        const { name } = extension;
        const commands: Record<string, CommandFactory> = {};

        let value: ReturnType<Extension["commands"]>;
        if (extension.type === "node") {
          const node = extension as Node;
          value = node.commands({ schema, type: schema.nodes[node.name] });
        } else if (extension.type === "mark") {
          const mark = extension as Mark;
          value = mark.commands({ schema, type: schema.marks[mark.name] });
        } else {
          value = (extension as Extension).commands({ schema });
        }

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
