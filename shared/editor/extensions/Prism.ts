import flattenDeep from "lodash/flattenDeep";
import padStart from "lodash/padStart";
import { Node } from "prosemirror-model";
import { Plugin, PluginKey, Transaction } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import refractor from "refractor/core";
import { isRemoteTransaction } from "../lib/multiplayer";
import { findBlockNodes } from "../queries/findChildren";

export const LANGUAGES = {
  none: "Plain text", // additional entry to disable highlighting
  bash: "Bash",
  clike: "C",
  cpp: "C++",
  csharp: "C#",
  css: "CSS",
  docker: "Docker",
  elixir: "Elixir",
  erlang: "Erlang",
  go: "Go",
  graphql: "GraphQL",
  groovy: "Groovy",
  haskell: "Haskell",
  hcl: "HCL",
  markup: "HTML",
  ini: "INI",
  java: "Java",
  javascript: "JavaScript",
  json: "JSON",
  jsx: "JSX",
  kotlin: "Kotlin",
  lisp: "Lisp",
  lua: "Lua",
  mermaidjs: "Mermaid Diagram",
  nginx: "Nginx",
  nix: "Nix",
  objectivec: "Objective-C",
  ocaml: "OCaml",
  perl: "Perl",
  php: "PHP",
  powershell: "Powershell",
  protobuf: "Protobuf",
  python: "Python",
  r: "R",
  ruby: "Ruby",
  rust: "Rust",
  scala: "Scala",
  sass: "Sass",
  scss: "SCSS",
  sql: "SQL",
  solidity: "Solidity",
  swift: "Swift",
  toml: "TOML",
  tsx: "TSX",
  typescript: "TypeScript",
  vb: "Visual Basic",
  verilog: "Verilog",
  vhdl: "VHDL",
  yaml: "YAML",
  zig: "Zig",
};

type ParsedNode = {
  text: string;
  classes: string[];
};

const cache: Record<number, { node: Node; decorations: Decoration[] }> = {};

function getDecorations({
  doc,
  name,
  lineNumbers,
}: {
  /** The prosemirror document to operate on. */
  doc: Node;
  /** The node name. */
  name: string;
  /** Whether to include decorations representing line numbers */
  lineNumbers?: boolean;
}) {
  const decorations: Decoration[] = [];
  const blocks: { node: Node; pos: number }[] = findBlockNodes(
    doc,
    true
  ).filter((item) => item.node.type.name === name);

  function parseNodes(
    nodes: refractor.RefractorNode[],
    classNames: string[] = []
  ): {
    text: string;
    classes: string[];
  }[] {
    return flattenDeep(
      nodes.map((node) => {
        if (node.type === "element") {
          const classes = [...classNames, ...(node.properties.className || [])];
          return parseNodes(node.children, classes);
        }

        return {
          text: node.value,
          classes: classNames,
        };
      })
    );
  }

  blocks.forEach((block) => {
    let startPos = block.pos + 1;
    const language = (
      block.node.attrs.language === "mermaidjs"
        ? "mermaid"
        : block.node.attrs.language
    ) as string;
    if (!language || language === "none" || !refractor.registered(language)) {
      return;
    }

    const lineDecorations = [];

    if (!cache[block.pos] || !cache[block.pos].node.eq(block.node)) {
      if (lineNumbers) {
        const lineCount =
          (block.node.textContent.match(/\n/g) || []).length + 1;
        const gutterWidth = String(lineCount).length;

        const lineCountText = new Array(lineCount)
          .fill(0)
          .map((_, i) => padStart(`${i + 1}`, gutterWidth, " "))
          .join("\n");

        lineDecorations.push(
          Decoration.node(
            block.pos,
            block.pos + block.node.nodeSize,
            {
              "data-line-numbers": `${lineCountText}`,
              style: `--line-number-gutter-width: ${gutterWidth};`,
            },
            {
              key: `line-${lineCount}-gutter`,
            }
          )
        );
      }

      const nodes = refractor.highlight(block.node.textContent, language);
      const newDecorations = parseNodes(nodes)
        .map((node: ParsedNode) => {
          const from = startPos;
          const to = from + node.text.length;

          startPos = to;

          return {
            ...node,
            from,
            to,
          };
        })
        .filter((node) => node.classes && node.classes.length)
        .map((node) =>
          Decoration.inline(node.from, node.to, {
            class: node.classes.join(" "),
          })
        )
        .concat(lineDecorations);

      cache[block.pos] = {
        node: block.node,
        decorations: newDecorations,
      };
    }

    cache[block.pos].decorations.forEach((decoration) => {
      decorations.push(decoration);
    });
  });

  Object.keys(cache)
    .filter((pos) => !blocks.find((block) => block.pos === Number(pos)))
    .forEach((pos) => {
      delete cache[Number(pos)];
    });

  return DecorationSet.create(doc, decorations);
}

export default function Prism({
  name,
  lineNumbers,
}: {
  /** The node name. */
  name: string;
  /** Whether to include decorations representing line numbers */
  lineNumbers?: boolean;
}) {
  let highlighted = false;

  return new Plugin({
    key: new PluginKey("prism"),
    state: {
      init: (_, { doc }) => DecorationSet.create(doc, []),
      apply: (transaction: Transaction, decorationSet, oldState, state) => {
        const nodeName = state.selection.$head.parent.type.name;
        const previousNodeName = oldState.selection.$head.parent.type.name;
        const codeBlockChanged =
          transaction.docChanged && [nodeName, previousNodeName].includes(name);

        // @ts-expect-error accessing private field.
        const isPaste = transaction.meta?.paste;

        if (
          !highlighted ||
          codeBlockChanged ||
          isPaste ||
          isRemoteTransaction(transaction)
        ) {
          highlighted = true;
          return getDecorations({ doc: transaction.doc, name, lineNumbers });
        }

        return decorationSet.map(transaction.mapping, transaction.doc);
      },
    },
    view: (view) => {
      if (!highlighted) {
        // we don't highlight code blocks on the first render as part of mounting
        // as it's expensive (relative to the rest of the document). Instead let
        // it render un-highlighted and then trigger a defered render of Prism
        // by updating the plugins metadata
        setTimeout(() => {
          if (!view.isDestroyed) {
            view.dispatch(view.state.tr.setMeta("prism", { loaded: true }));
          }
        }, 10);
      }
      return {};
    },
    props: {
      decorations(state) {
        return this.getState(state);
      },
    },
  });
}
