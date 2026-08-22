import type { Node as ProsemirrorNode, Schema } from "prosemirror-model";
import { Fragment, Slice } from "prosemirror-model";
import type { Transaction } from "prosemirror-state";
import { Plugin, PluginKey } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import { Decoration, DecorationSet } from "prosemirror-view";
import { HeadingPrefixStyle } from "../../types";
import { formatCounter } from "../../utils/counters";
import { changedDescendants } from "../lib/changedDescendants";
import Extension from "../lib/Extension";
import { isRemoteTransaction } from "../lib/multiplayer";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";

/**
 * Plugin key used to change the heading prefix style at runtime by dispatching
 * a transaction with the new style as metadata.
 */
export const headingPrefixPluginKey = new PluginKey<HeadingPrefixPluginState>(
  "heading-prefix"
);

/**
 * Helper for computing, formatting, and serializing heading prefix labels.
 */
export class HeadingPrefixHelper {
  /**
   * Formats a hierarchical heading counter into a display label.
   *
   * @param counters the count at each heading depth, ordered from the outermost level.
   * @param style the prefix style to format the counters with.
   * @returns the formatted label, for example "1.a.i".
   */
  public static format(counters: number[], style: HeadingPrefixStyle): string {
    return counters
      .map((count, depth) => formatCounter(count, depth, style))
      .join(".");
  }

  /**
   * Computes the prefix label for each heading in a sequence of heading
   * levels, mirroring the numbering displayed in the document.
   *
   * @param levels the heading levels in document order.
   * @param style the prefix style to format the labels with.
   * @param options when `indented` is set the surrounding display already
   * communicates hierarchy through indentation, so Outline-style labels show
   * only the counter for their own level, for example "A" instead of "I.A".
   * @returns a label for each input level, for example "1.a.i".
   */
  public static labels(
    levels: number[],
    style: HeadingPrefixStyle,
    options?: { indented?: boolean }
  ): string[] {
    const labels: string[] = [];
    const stack: { level: number; count: number }[] = [];

    for (const level of levels) {
      // A shallower heading closes the deeper groups before it. When no group
      // at this level exists, continue the count of the closed group so that
      // sibling sections keep a single sequence.
      let closed;
      while (stack.length && stack[stack.length - 1].level > level) {
        closed = stack.pop();
      }
      const top = stack[stack.length - 1];
      if (top && top.level === level) {
        top.count += 1;
      } else {
        stack.push({ level, count: (closed?.count ?? 0) + 1 });
      }
      const counters = stack.map((item) => item.count);
      labels.push(
        options?.indented && style === HeadingPrefixStyle.Outline
          ? formatCounter(
              counters[counters.length - 1],
              counters.length - 1,
              style
            )
          : HeadingPrefixHelper.format(counters, style)
      );
    }

    return labels;
  }

  /**
   * Computes the prefix labels for the headings that intersect a document
   * range, numbered against the full document. Headings inside tables are
   * excluded.
   *
   * @param doc the document that contains the headings.
   * @param style the prefix style to format the labels with.
   * @param from the start of the range.
   * @param to the end of the range.
   * @returns the labels of the intersecting headings, in document order.
   */
  public static labelsInRange(
    doc: ProsemirrorNode,
    style: HeadingPrefixStyle,
    from: number,
    to: number
  ): string[] {
    const headings = HeadingPrefixHelper.collectHeadings(doc);
    const labels = HeadingPrefixHelper.labels(
      headings.map((heading) => heading.level),
      style
    );

    return headings
      .map((heading, index) => ({ heading, label: labels[index] }))
      .filter(
        ({ heading }) =>
          heading.pos < to && heading.pos + heading.nodeSize > from
      )
      .map(({ label }) => label);
  }

  /**
   * Collects the headings that take part in section numbering, in document
   * order. Headings inside tables are excluded.
   *
   * @param doc the document to collect headings from.
   * @returns the position, level, and size of each heading.
   */
  public static collectHeadings(doc: ProsemirrorNode) {
    const headings: { pos: number; level: number; nodeSize: number }[] = [];
    doc.descendants((node, pos) => {
      // Headings inside tables take no part in section numbering.
      if (node.type.name === "table") {
        return false;
      }
      if (node.type.name === "heading") {
        headings.push({
          pos,
          level: node.attrs.level,
          nodeSize: node.nodeSize,
        });
      }
      return true;
    });
    return headings;
  }

  /**
   * Returns a copy of the slice in which each heading's content starts with
   * the matching prefix label as plain text, for use when serializing a
   * copied selection. Labels are consumed in the order headings appear;
   * headings inside tables are skipped.
   *
   * @param slice the slice to copy.
   * @param labels the labels to prepend, one per heading in the slice.
   * @param schema the schema used to create the text nodes.
   * @returns a new slice with the labels injected.
   */
  public static injectIntoSlice(
    slice: Slice,
    labels: string[],
    schema: Schema
  ): Slice {
    const queue = [...labels];

    const inject = (fragment: Fragment): Fragment => {
      const nodes: ProsemirrorNode[] = [];
      fragment.forEach((node) => {
        if (node.isText || node.isLeaf || !queue.length) {
          nodes.push(node);
        } else if (node.type.name === "table") {
          // Headings inside tables carry no number.
          nodes.push(node);
        } else if (node.type.name === "heading") {
          const label = queue.shift();
          nodes.push(
            node.copy(
              Fragment.from(schema.text(`${label} `)).append(node.content)
            )
          );
        } else {
          nodes.push(node.copy(inject(node.content)));
        }
      });
      return Fragment.fromArray(nodes);
    };

    return new Slice(inject(slice.content), slice.openStart, slice.openEnd);
  }

  /**
   * Removes prefix elements from pasted HTML so that copied numbering does
   * not become part of the document content.
   *
   * @param html the pasted HTML.
   * @returns the HTML with prefix elements removed.
   */
  public static stripFromHTML(html: string): string {
    if (!html.includes(EditorStyleHelper.headingPrefix)) {
      return html;
    }
    const parsed = new DOMParser().parseFromString(html, "text/html");
    parsed
      .querySelectorAll(`.${EditorStyleHelper.headingPrefix}`)
      .forEach((element) => element.remove());
    return parsed.body.innerHTML;
  }
}

interface HeadingPrefixPluginState {
  style: HeadingPrefixStyle;
  decorations: DecorationSet;
}

interface HeadingPrefixOptions {
  /** The style of prefix displayed before headings. */
  headingPrefix?: HeadingPrefixStyle;
}

/**
 * An extension that displays a section number, such as "1.1", before each
 * heading in the document, rendered with CSS from a node decoration
 * attribute. Headings inside tables are not numbered.
 */
export default class HeadingPrefix extends Extension<HeadingPrefixOptions> {
  get name() {
    return "heading_prefix";
  }

  get allowInReadOnly() {
    return true;
  }

  get plugins(): Plugin[] {
    return [
      new Plugin<HeadingPrefixPluginState>({
        key: headingPrefixPluginKey,
        state: {
          init: (_, state) => {
            const style = this.options.headingPrefix ?? HeadingPrefixStyle.None;
            return {
              style,
              decorations: this.createDecorations(state.doc, style),
            };
          },
          apply: (tr, pluginState, _oldState, newState) => {
            const meta: HeadingPrefixStyle | undefined = tr.getMeta(
              headingPrefixPluginKey
            );
            const style = meta ?? pluginState.style;

            if (meta !== undefined && meta !== pluginState.style) {
              return {
                style,
                decorations: this.createDecorations(tr.doc, style),
              };
            }
            if (!tr.docChanged || style === HeadingPrefixStyle.None) {
              return pluginState;
            }
            if (
              isRemoteTransaction(tr, newState) ||
              this.hasHeadingChange(tr)
            ) {
              return {
                style,
                decorations: this.createDecorations(tr.doc, style),
              };
            }
            return {
              style,
              decorations: pluginState.decorations.map(tr.mapping, tr.doc),
            };
          },
        },
        props: {
          decorations: (state) =>
            headingPrefixPluginKey.getState(state)?.decorations,
          handleDOMEvents: {
            copy: this.handleCopy,
            cut: this.handleCut,
          },
          transformPastedHTML: (html: string) =>
            HeadingPrefixHelper.stripFromHTML(html),
        },
      }),
    ];
  }

  /**
   * Serializes the copied selection with the heading prefixes included: as
   * removable tagged elements in the HTML flavor, and as plain text in the
   * text flavor. The document content itself is not modified.
   */
  private handleCopy = (view: EditorView, event: ClipboardEvent): boolean => {
    const style =
      headingPrefixPluginKey.getState(view.state)?.style ??
      HeadingPrefixStyle.None;
    const { selection } = view.state;
    if (
      style === HeadingPrefixStyle.None ||
      selection.empty ||
      !event.clipboardData
    ) {
      return false;
    }

    const labels = HeadingPrefixHelper.labelsInRange(
      view.state.doc,
      style,
      selection.from,
      selection.to
    );
    if (!labels.length) {
      return false;
    }

    const { dom, slice } = view.serializeForClipboard(selection.content());

    // Tag the serialized HTML with prefix elements that are removed again
    // when pasted back into the editor.
    const queue = [...labels];
    dom.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((heading) => {
      // Headings inside tables carry no number.
      if (heading.closest("table")) {
        return;
      }
      const label = queue.shift();
      if (label !== undefined) {
        const prefix = document.createElement("span");
        prefix.className = EditorStyleHelper.headingPrefix;
        prefix.textContent = `${label} `;
        heading.insertBefore(prefix, heading.firstChild);
      }
    });

    // Bake the labels into the text flavor through the text serializer.
    const injected = HeadingPrefixHelper.injectIntoSlice(
      slice,
      labels,
      view.state.schema
    );
    const text =
      view.someProp("clipboardTextSerializer", (f) => f(injected, view)) ||
      injected.content.textBetween(0, injected.content.size, "\n\n");

    event.preventDefault();
    event.clipboardData.clearData();
    event.clipboardData.setData("text/html", dom.innerHTML);
    event.clipboardData.setData("text/plain", text);
    return true;
  };

  /**
   * Handles cut as a prefix-aware copy followed by deleting the selection,
   * mirroring the editor's default cut behavior.
   */
  private handleCut = (view: EditorView, event: ClipboardEvent): boolean => {
    if (!this.handleCopy(view, event)) {
      return false;
    }
    if (view.editable) {
      view.dispatch(
        view.state.tr
          .deleteSelection()
          .scrollIntoView()
          .setMeta("uiEvent", "cut")
      );
    }
    return true;
  };

  /**
   * Check if the transaction added, removed, or modified any heading nodes by
   * comparing changed descendants in both directions.
   */
  private hasHeadingChange(tr: Transaction): boolean {
    let found = false;
    const check = (node: ProsemirrorNode) => {
      if (node.type.name === "heading") {
        found = true;
      }
    };

    changedDescendants(tr.before, tr.doc, 0, check);
    if (!found) {
      changedDescendants(tr.doc, tr.before, 0, check);
    }
    return found;
  }

  private createDecorations(
    doc: ProsemirrorNode,
    style: HeadingPrefixStyle
  ): DecorationSet {
    if (style === HeadingPrefixStyle.None) {
      return DecorationSet.empty;
    }

    const headings = HeadingPrefixHelper.collectHeadings(doc);
    const labels = HeadingPrefixHelper.labels(
      headings.map((heading) => heading.level),
      style
    );
    // The label is rendered with CSS as a ::before pseudo-element rather than
    // a widget, so that no non-editable DOM sits inside the heading content
    // where it would interfere with text selection and replacement.
    const decorations = headings.map((heading, index) => {
      const label = labels[index];
      return Decoration.node(
        heading.pos,
        heading.pos + heading.nodeSize,
        { "data-heading-prefix": label },
        { label }
      );
    });

    return DecorationSet.create(doc, decorations);
  }
}
