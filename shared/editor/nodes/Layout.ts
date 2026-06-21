import type { ParseSpec } from "prosemirror-markdown";
import type { NodeSpec, Node as ProsemirrorNode } from "prosemirror-model";
import { NodeSelection, Plugin } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import type { MarkdownSerializerState } from "../lib/markdown/serializer";
import layoutsRule from "../rules/layouts";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";
import { LayoutView } from "./LayoutView";
import Node from "./Node";

/**
 * A layout block places its sibling {@link LayoutSection} columns side by side.
 *
 * The first interaction that creates a layout is dragging one image on top of
 * another, which wraps both images into a two column layout. See the drop
 * handler registered in {@link Layout.plugins}.
 */
export default class Layout extends Node {
  get name() {
    return "container_layout";
  }

  get schema(): NodeSpec {
    return {
      content: "layout_section{2,}",
      group: "block",
      isolating: true,
      defining: true,
      parseDOM: [{ tag: `div.${EditorStyleHelper.layout}` }],
      toDOM: () => [
        "div",
        { class: EditorStyleHelper.layout },
        ["div", { class: EditorStyleHelper.layoutContent }, 0],
      ],
    };
  }

  get rulePlugins() {
    return [layoutsRule];
  }

  get plugins() {
    // The position of an image node currently being dragged within the editor,
    // captured on dragstart so it can be removed when forming a layout.
    let draggedImagePos: number | null = null;

    return [
      new Plugin({
        props: {
          nodeViews: {
            [this.name]: (node, view, getPos) =>
              new LayoutView(node, view, getPos as () => number | undefined),
          },
          handleDOMEvents: {
            dragstart: (view) => {
              const { selection } = view.state;
              draggedImagePos =
                selection instanceof NodeSelection &&
                selection.node.type.name === "image"
                  ? selection.from
                  : null;
              return false;
            },
            dragend: () => {
              draggedImagePos = null;
              return false;
            },
          },
          handleDrop: (view, event) => {
            const sourcePos = draggedImagePos;
            draggedImagePos = null;
            if (sourcePos === null || !(event instanceof DragEvent)) {
              return false;
            }
            return this.createLayoutFromDrop(view, event, sourcePos);
          },
        },
      }),
    ];
  }

  /**
   * Attempt to wrap the dragged image and the image it was dropped on into a
   * two column layout.
   *
   * @param view the editor view.
   * @param event the drop event.
   * @param sourcePos the document position of the dragged image.
   * @returns true if a layout was created, otherwise false.
   */
  private createLayoutFromDrop(
    view: EditorView,
    event: DragEvent,
    sourcePos: number
  ): boolean {
    const { doc, schema } = view.state;
    const targetDom =
      event.target instanceof HTMLElement
        ? event.target.closest(`.component-image`)
        : null;
    if (!targetDom) {
      return false;
    }

    const targetPos = imagePosFromDOM(view, targetDom);
    if (targetPos === null || targetPos === sourcePos) {
      return false;
    }

    const $source = doc.resolve(sourcePos);
    const $target = doc.resolve(targetPos);

    // Only handle the simple case where each image sits alone in a top-level
    // paragraph. Anything more complex falls back to the default drop behaviour.
    if (
      $source.depth !== 1 ||
      $target.depth !== 1 ||
      $source.parent.type !== schema.nodes.paragraph ||
      $target.parent.type !== schema.nodes.paragraph ||
      $source.parent.childCount !== 1 ||
      $target.parent.childCount !== 1
    ) {
      return false;
    }

    const sourceImage = $source.nodeAfter;
    const targetImage = $target.nodeAfter;
    if (!sourceImage || !targetImage) {
      return false;
    }

    // Decide which side the dragged image lands on based on the cursor position
    // relative to the target image.
    const rect = targetDom.getBoundingClientRect();
    const dropOnLeft = event.clientX < rect.left + rect.width / 2;

    const section = schema.nodes.layout_section;
    const paragraph = schema.nodes.paragraph;
    const makeSection = (image: ProsemirrorNode) =>
      section.create(null, paragraph.create(null, image));

    const layout = schema.nodes.container_layout.create(null, [
      makeSection(dropOnLeft ? sourceImage : targetImage),
      makeSection(dropOnLeft ? targetImage : sourceImage),
    ]);

    const sourceRange = { from: $source.before(1), to: $source.after(1) };
    const targetRange = { from: $target.before(1), to: $target.after(1) };

    const tr = view.state.tr;
    // Apply the edit at the higher position first so the lower positions remain
    // valid without remapping.
    if (targetRange.from > sourceRange.from) {
      tr.replaceRangeWith(targetRange.from, targetRange.to, layout);
      tr.delete(sourceRange.from, sourceRange.to);
    } else {
      tr.delete(sourceRange.from, sourceRange.to);
      tr.replaceRangeWith(targetRange.from, targetRange.to, layout);
    }

    event.preventDefault();
    view.dispatch(tr.scrollIntoView());
    return true;
  }

  toMarkdown(state: MarkdownSerializerState, node: ProsemirrorNode) {
    state.write("\n" + state.repeat(":", 4) + "layout\n");
    state.renderContent(node);
    state.ensureNewLine();
    state.write(state.repeat(":", 4));
    state.closeBlock(node);
  }

  parseMarkdown(): ParseSpec {
    return { block: "container_layout" };
  }
}

/**
 * Resolve the document position of an image node given a DOM element within its
 * node view.
 *
 * @param view the editor view.
 * @param dom the DOM element belonging to the image's node view.
 * @returns the position before the image node, or null if not found.
 */
function imagePosFromDOM(view: EditorView, dom: Element): number | null {
  const pos = view.posAtDOM(dom, 0);
  const { doc } = view.state;
  for (const candidate of [pos, pos - 1, pos + 1]) {
    if (candidate >= 0 && candidate < doc.content.size) {
      const node = doc.nodeAt(candidate);
      if (node?.type.name === "image") {
        return candidate;
      }
    }
  }
  return null;
}
