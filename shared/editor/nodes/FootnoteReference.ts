import type { PluginSimple } from "markdown-it";
import type Token from "markdown-it/lib/token.mjs";
import { InputRule } from "prosemirror-inputrules";
import type {
  NodeSpec,
  NodeType,
  Node as ProsemirrorNode,
} from "prosemirror-model";
import type { Command, EditorState, Transaction } from "prosemirror-state";
import { TextSelection } from "prosemirror-state";
import type { MarkdownSerializerState } from "../lib/markdown/serializer";
import { findChildren } from "../queries/findChildren";
import { isInCode } from "../queries/isInCode";
import footnotesRule, { footnoteLabel } from "../rules/footnotes";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";
import { footnoteId } from "./Footnote";
import Node from "./Node";

/**
 * Returns the next unused numeric footnote label in the document.
 *
 * @param doc the document node.
 * @returns the next label.
 */
function nextLabel(doc: ProsemirrorNode): string {
  let max = 0;
  doc.descendants((node) => {
    if (
      node.type.name === "footnote_reference" ||
      node.type.name === "footnote"
    ) {
      max = Math.max(max, parseInt(node.attrs.label, 10) || 0);
    }
  });
  return String(max + 1);
}

/**
 * Replaces the given range with a footnote reference. When no footnote with the
 * label exists yet an empty one is appended to the footnotes at the end of the
 * document and the selection is moved into it.
 *
 * @param state the editor state.
 * @param type the footnote reference node type.
 * @param label the footnote label.
 * @param from the start of the range to replace.
 * @param to the end of the range to replace.
 * @returns the transaction, or null if the schema has no footnotes.
 */
function insertFootnote(
  state: EditorState,
  type: NodeType,
  label: string,
  from: number,
  to: number
): Transaction | null {
  const { footnote, footnotes, paragraph } = state.schema.nodes;
  if (!footnote || !footnotes) {
    return null;
  }

  const tr = state.tr.replaceWith(from, to, type.create({ label }));
  const [list] = findChildren(tr.doc, (node) => node.type === footnotes);

  if (
    list &&
    findChildren(list.node, (node) => node.attrs.label === label).length
  ) {
    return tr;
  }

  const item = footnote.create({ label }, paragraph.create());
  let pos: number;

  if (list) {
    pos = list.pos + list.node.nodeSize - 1;
    tr.insert(pos, item);
  } else {
    // Insert before the trailing empty paragraph, if there is one.
    const last = tr.doc.lastChild;
    const end =
      last?.type === paragraph && last.childCount === 0
        ? tr.doc.content.size - last.nodeSize
        : tr.doc.content.size;
    tr.insert(end, footnotes.create(null, item));
    pos = end + 1;
  }

  return tr
    .setSelection(TextSelection.near(tr.doc.resolve(pos + 1)))
    .scrollIntoView();
}

/**
 * An inline reference to a footnote, rendered as a superscript link to the
 * footnote at the end of the document.
 */
export default class FootnoteReference extends Node {
  get name() {
    return "footnote_reference";
  }

  get markdownToken() {
    return "footnote_ref";
  }

  get schema(): NodeSpec {
    return {
      attrs: {
        label: {
          default: "1",
          validate: "string",
        },
      },
      inline: true,
      group: "inline",
      atom: true,
      marks: "",
      parseDOM: [
        {
          tag: `sup.${EditorStyleHelper.footnoteReference}`,
          priority: 100,
          getAttrs: (dom: HTMLElement) => {
            const label = dom.textContent?.trim();
            return label ? { label } : false;
          },
        },
      ],
      toDOM: (node) => [
        "sup",
        { class: EditorStyleHelper.footnoteReference },
        ["a", { href: `#${footnoteId(node.attrs.label)}` }, node.attrs.label],
      ],
      leafText: (node) => `[^${node.attrs.label}]`,
    };
  }

  get rulePlugins(): PluginSimple[] {
    return [footnotesRule];
  }

  inputRules({ type }: { type: NodeType }) {
    return [
      new InputRule(/\[\^([^\s\]]+)\]$/, (state, match, start, end) =>
        isInCode(state)
          ? null
          : insertFootnote(state, type, match[1], start, end)
      ),
    ];
  }

  commands({ type }: { type: NodeType }) {
    return (): Command => (state, dispatch) => {
      const { from, to } = state.selection;
      const tr = insertFootnote(state, type, nextLabel(state.doc), from, to);
      if (!tr) {
        return false;
      }
      dispatch?.(tr);
      return true;
    };
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    state.write(`[^${node.attrs.label}]`);
  }

  parseMarkdown() {
    return {
      node: this.name,
      getAttrs: (token: Token) => ({ label: footnoteLabel(token) }),
    };
  }
}
