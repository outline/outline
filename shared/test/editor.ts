import { Schema } from "prosemirror-model";
import { EditorState, TextSelection } from "prosemirror-state";
import type { Plugin } from "prosemirror-state";
import ExtensionManager from "../editor/lib/ExtensionManager";
import { richExtensions } from "../editor/nodes";

/**
 * Extension manager using the full rich extensions from the editor.
 */
export const extensionManager = new ExtensionManager(richExtensions);

/**
 * Schema using the actual rich extensions from the editor.
 * This should be used for testing to ensure we're testing against real node definitions.
 */
export const schema = new Schema({
  nodes: extensionManager.nodes,
  marks: extensionManager.marks,
});

/**
 * Creates an editor state with the given document and plugins.
 *
 * @param doc - the document node.
 * @param plugins - optional array of plugins to include.
 * @returns editor state.
 */
export function createEditorState(
  doc: ReturnType<typeof schema.node>,
  plugins: Plugin[] = []
) {
  return EditorState.create({
    doc,
    schema,
    plugins,
  });
}

/**
 * Creates an editor state with the selection set inside a specific position.
 * Useful for tests that require the selection to be inside a table or other node.
 *
 * @param doc - the document node.
 * @param pos - position to set selection near.
 * @param plugins - optional array of plugins to include.
 * @returns editor state with selection at the specified position.
 */
export function createEditorStateWithSelection(
  doc: ReturnType<typeof schema.node>,
  pos: number,
  plugins: Plugin[] = []
) {
  const state = createEditorState(doc, plugins);
  const $pos = state.doc.resolve(pos);
  const selection = TextSelection.near($pos);
  return state.apply(state.tr.setSelection(selection));
}

/**
 * Creates a paragraph node with optional text content.
 *
 * @param text - the text content (empty string for empty paragraph).
 * @returns paragraph node.
 */
export function p(text: string) {
  return schema.nodes.paragraph.create(
    null,
    text ? schema.text(text) : undefined
  );
}

/**
 * Creates a table cell (td) node.
 *
 * @param content - the cell content text.
 * @param attrs - optional cell attributes (colspan, rowspan, colwidth, alignment).
 * @returns td node.
 */
export function td(
  content: string,
  attrs?: {
    colspan?: number;
    rowspan?: number;
    colwidth?: number[] | null;
    alignment?: string | null;
  }
) {
  return schema.nodes.td.create(attrs ?? null, p(content));
}

/**
 * Creates a table header cell (th) node.
 *
 * @param content - the cell content text.
 * @param attrs - optional cell attributes (colspan, rowspan, colwidth, alignment).
 * @returns th node.
 */
export function th(
  content: string,
  attrs?: {
    colspan?: number;
    rowspan?: number;
    colwidth?: number[] | null;
    alignment?: string | null;
  }
) {
  return schema.nodes.th.create(attrs ?? null, p(content));
}

/**
 * Creates a table row (tr) node.
 *
 * @param cells - array of cell nodes (td or th).
 * @returns tr node.
 */
export function tr(cells: ReturnType<typeof td | typeof th>[]) {
  return schema.nodes.tr.create(null, cells);
}

/**
 * Creates a table node.
 *
 * @param rows - array of row nodes.
 * @param attrs - optional table attributes.
 * @returns table node.
 */
export function table(
  rows: ReturnType<typeof tr>[],
  attrs?: { layout?: string | null }
) {
  return schema.nodes.table.create(attrs ?? null, rows);
}

/**
 * Creates a heading node.
 *
 * @param text - the heading text.
 * @param level - the heading level (1-6).
 * @returns heading node.
 */
export function heading(text: string, level: 1 | 2 | 3 | 4 | 5 | 6 = 1) {
  return schema.nodes.heading.create(
    { level },
    text ? schema.text(text) : undefined
  );
}

/**
 * Creates a blockquote node.
 *
 * @param content - array of block nodes or a single paragraph text.
 * @returns blockquote node.
 */
export function blockquote(
  content: string | ReturnType<typeof p | typeof heading>[]
) {
  const children = typeof content === "string" ? [p(content)] : content;
  return schema.nodes.blockquote.create(null, children);
}

/**
 * Creates a bullet list node.
 *
 * @param items - array of text strings for list items.
 * @returns bullet_list node.
 */
export function bulletList(items: string[]) {
  return schema.nodes.bullet_list.create(
    null,
    items.map((text) => schema.nodes.list_item.create(null, p(text)))
  );
}

/**
 * Creates an ordered list node.
 *
 * @param items - array of text strings for list items.
 * @returns ordered_list node.
 */
export function orderedList(items: string[]) {
  return schema.nodes.ordered_list.create(
    null,
    items.map((text) => schema.nodes.list_item.create(null, p(text)))
  );
}

/**
 * Creates a code block node.
 *
 * @param code - the code content.
 * @param language - optional language for syntax highlighting.
 * @returns code_block node.
 */
export function codeBlock(code: string, language?: string) {
  return schema.nodes.code_block.create(
    language ? { language } : null,
    code ? schema.text(code) : undefined
  );
}

/**
 * Creates a horizontal rule node.
 *
 * @returns hr node.
 */
export function hr() {
  return schema.nodes.hr.create();
}

/**
 * Creates a document node with the given content.
 *
 * @param content - block node(s) to include in the document.
 * @returns doc node.
 */
export function doc(
  content:
    | ReturnType<
        | typeof p
        | typeof table
        | typeof heading
        | typeof blockquote
        | typeof bulletList
        | typeof orderedList
        | typeof codeBlock
        | typeof hr
      >
    | ReturnType<
        | typeof p
        | typeof table
        | typeof heading
        | typeof blockquote
        | typeof bulletList
        | typeof orderedList
        | typeof codeBlock
        | typeof hr
      >[]
) {
  return schema.nodes.doc.create(null, content);
}
