import { isMatch } from "es-toolkit/compat";
import type { JSDOM } from "jsdom";
import { Fragment, type Node } from "prosemirror-model";
import { ChangesetHelper } from "@shared/editor/lib/ChangesetHelper";
import textBetween from "@shared/editor/lib/textBetween";
import { EditorStyleHelper } from "@shared/editor/styles/EditorStyleHelper";
import { addTags } from "@server/logging/tracer";
import { traceFunction } from "@server/logging/tracing";
import type { Document, Revision } from "@server/models";
import type { HTMLOptions } from "@server/models/helpers/DocumentHelper";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import type { MentionAttrs } from "@server/models/helpers/ProsemirrorHelper";

/**
 * Maximum amount of visible text, in characters, to include in a snippet.
 */
export const maxSnippetChars = 1000;

/**
 * Maximum number of top-level blocks to include in a leading snippet.
 */
const maxLeadingBlocks = 3;

/**
 * Maximum number of list items or table rows to keep when trimming a container.
 */
const maxContainerChildren = 10;

/**
 * Build an email snippet around a mention. A surrounding list is trimmed to
 * the mentioned item plus one sibling on either side, a table to the
 * mentioned row; otherwise the largest complete block that still fits the
 * size budget is kept.
 *
 * @param doc The top-level doc node of a document / revision.
 * @param mention The mention to build the snippet around.
 * @returns A new top-level doc node with the chosen block as its only child,
 * or undefined if the mention could not be found.
 */
export function mentionSnippet(doc: Node, mention: MentionAttrs) {
  // A mention is an inline node, so it always lives inside a textblock
  // (paragraph or heading). Locate it once and resolve its position.
  let mentionPos: number | undefined;
  doc.descendants((node: Node, pos: number) => {
    if (mentionPos !== undefined) {
      return false;
    }
    if (node.type.name === "mention" && isMatch(node.attrs, mention)) {
      mentionPos = pos;
      return false;
    }
    return true;
  });

  if (mentionPos === undefined) {
    return undefined;
  }

  const $pos = doc.resolve(mentionPos);

  // Lists and tables can be long, so rather than show the whole container,
  // trim a list to the mentioned item plus one sibling on either side, and a
  // table to the mentioned row. Use the nearest such ancestor so nested
  // structures show the content closest to the mention.
  const listTypes = ["bullet_list", "ordered_list", "checkbox_list"];
  for (let d = $pos.depth - 1; d >= 1; d--) {
    const container = $pos.node(d);
    const name = container.type.name;

    if (listTypes.includes(name)) {
      const index = $pos.index(d);
      const start = Math.max(0, index - 1);
      const end = Math.min(container.childCount, index + 2);
      const items: Node[] = [];
      for (let i = start; i < end; i++) {
        items.push(container.child(i));
      }
      // Keep an ordered list's numbering aligned with the original document
      // by advancing its start to match the first item shown.
      const attrs =
        name === "ordered_list" && start > 0
          ? {
              ...container.attrs,
              order: (container.attrs.order ?? 1) + start,
            }
          : container.attrs;
      const trimmed = container.type.create(
        attrs,
        Fragment.fromArray(items),
        container.marks
      );
      return doc.copy(Fragment.fromArray([trimmed]));
    }

    if (name === "table") {
      const row = container.child($pos.index(d));
      return doc.copy(
        Fragment.fromArray([container.copy(Fragment.fromArray([row]))])
      );
    }
  }

  // Always include at least the textblock the mention sits in, then climb the
  // ancestor chain outward keeping the largest complete block that still fits
  // the size budget. Each ancestor strictly contains the previous, so sizes
  // grow monotonically and we can stop at the first that overflows.
  let node = $pos.node($pos.depth);
  for (let d = $pos.depth - 1; d >= 1; d--) {
    const ancestor = $pos.node(d);
    // textBetween rather than textContent so leaf text (mentions, etc.) is
    // counted towards the budget.
    const length = textBetween(ancestor, 0, ancestor.content.size).length;
    if (length > maxSnippetChars) {
      break;
    }
    node = ancestor;
  }

  // Return a new top-level "doc" node to maintain structure during serialization.
  return doc.copy(Fragment.fromArray([node]));
}

/**
 * Build an email snippet from the first blocks of a document. Empty
 * paragraphs are skipped, and blocks are added until the block limit or the
 * size budget is reached. Lists and tables are trimmed to the leading items
 * or rows that fit.
 *
 * @param doc The top-level doc node of a document.
 * @returns A new top-level doc node with the leading blocks, or undefined if
 * the document has no content.
 */
export function leadingSnippet(doc: Node) {
  const blocks: Node[] = [];
  let length = 0;

  for (let i = 0; i < doc.childCount; i++) {
    if (blocks.length >= maxLeadingBlocks) {
      break;
    }

    const child = doc.child(i);
    if (child.isTextblock && child.childCount === 0) {
      continue;
    }

    // Count the separator between blocks, as textBetween does.
    const remaining = maxSnippetChars - length - (blocks.length ? 1 : 0);
    const block = trimContainer(child, remaining) ?? child;
    const blockLength = textLength(block);
    if (blockLength > remaining) {
      if (!blocks.length) {
        blocks.push(block);
      }
      break;
    }

    blocks.push(block);
    length += blockLength + (blocks.length > 1 ? 1 : 0);
  }

  return blocks.length ? doc.copy(Fragment.fromArray(blocks)) : undefined;
}

/**
 * Generates a compact HTML diff between documents or revisions, showing only
 * the parts of the document that changed and the immediate context. Breaks in
 * the diff are denoted with "div.diff-context-break" nodes.
 *
 * @param before The before document.
 * @param after The after document.
 * @param options Options passed to HTML generation.
 * @returns The diff as an HTML string, an empty string when there is no
 * before document, or undefined when the documents contain no changes or
 * the changeset was too expensive to compute.
 */
export const diffSnippet = traceFunction({
  spanName: "emails",
  methodName: "diffSnippet",
})(renderDiffSnippet);

async function renderDiffSnippet(
  before: Document | Revision | null,
  after: Revision,
  options?: HTMLOptions
): Promise<string | undefined> {
  if (!before) {
    return "";
  }

  addTags({
    beforeId: before.id,
    documentId: after.documentId,
    options,
  });

  const beforeJSON = await DocumentHelper.toJSON(before);
  const afterJSON = await DocumentHelper.toJSON(after);
  const changeset = ChangesetHelper.getChangeset(afterJSON, beforeJSON);

  // Without a changeset no diff elements can render, so skip the expensive
  // HTML generation and clipping entirely.
  if (!changeset?.changes.length) {
    return undefined;
  }

  const html = await DocumentHelper.toHTML(after, {
    ...options,
    changes: changeset.changes,
  });
  // Loaded lazily to keep jsdom off the startup path — only HTML export needs it.
  const { JSDOM } = await import("jsdom");
  const dom = new JSDOM(html);
  try {
    return clipDiff(dom.window.document);
  } finally {
    try {
      dom.window.close();
    } catch (_err) {
      // Best effort, closing the window releases its timers and resources.
    }
  }
}

/**
 * Trims a list or table to the leading items or rows that fit the budget and
 * the child limit, always keeping at least the first.
 *
 * @param block The top-level block to trim.
 * @param budget The maximum amount of visible text, in characters.
 * @returns The trimmed block, or undefined if the block is not a list or table.
 */
function trimContainer(block: Node, budget: number) {
  const trimmableTypes = [
    "bullet_list",
    "ordered_list",
    "checkbox_list",
    "table",
  ];
  if (!trimmableTypes.includes(block.type.name) || !block.childCount) {
    return undefined;
  }

  const children: Node[] = [];
  let length = 0;

  for (let i = 0; i < Math.min(block.childCount, maxContainerChildren); i++) {
    const child = block.child(i);
    length += textLength(child) + (children.length ? 1 : 0);
    if (children.length && length > budget) {
      break;
    }
    children.push(child);
  }

  return block.copy(Fragment.fromArray(children));
}

/**
 * Returns the length of the visible text in a node, including leaf text and
 * block separators.
 *
 * @param node The node to measure.
 * @returns The number of characters.
 */
function textLength(node: Node) {
  return textBetween(node, 0, node.content.size).length;
}

/**
 * Clips a rendered diff document down to only the changed nodes and their
 * surrounding context, returning the resulting HTML or undefined when the
 * document contains no diff elements.
 *
 * @param doc The rendered diff document to clip.
 * @returns The clipped HTML, or undefined when there is nothing to show.
 */
function clipDiff(doc: JSDOM["window"]["document"]) {
  const diffSelector = [
    EditorStyleHelper.diffInsertion,
    EditorStyleHelper.diffDeletion,
    EditorStyleHelper.diffModification,
    EditorStyleHelper.diffNodeInsertion,
    EditorStyleHelper.diffNodeDeletion,
    EditorStyleHelper.diffNodeModification,
  ]
    .map((className) => `.${className}`)
    .join(",");

  // Each node is checked again as the neighbor of its siblings, and removing
  // nodes without changes does not change the result for the others.
  const results = new Map<Element, boolean>();

  const containsDiffElement = (node: Element | null) => {
    if (!node) {
      return false;
    }

    let result = results.get(node);
    if (result === undefined) {
      result = node.matches(diffSelector) || !!node.querySelector(diffSelector);
      results.set(node, result);
    }
    return result;
  };

  // The diffing lib isn't able to catch all changes currently, e.g. changing
  // the type of a mark will result in an empty diff.
  // see: https://github.com/tnwinc/htmldiff.js/issues/10
  if (!containsDiffElement(doc.querySelector("#content"))) {
    return;
  }

  // We use querySelectorAll to get a static NodeList as we'll be modifying
  // it as we iterate, rather than getting content.childNodes.
  const contents = doc.querySelectorAll("#content > *");
  let previousNodeRemoved = false;
  let previousDiffClipped = false;

  const br = doc.createElement("div");
  br.innerHTML = "…";
  br.className = "diff-context-break";

  for (const childNode of contents) {
    // If the block node contains a diff tag then we want to keep it
    if (containsDiffElement(childNode as Element)) {
      if (previousNodeRemoved && previousDiffClipped) {
        childNode.parentElement?.insertBefore(br.cloneNode(true), childNode);
      }
      previousNodeRemoved = false;
      previousDiffClipped = true;

      // Special case for largetables, as this block can get very large we
      // want to clip it to only the changed rows and surrounding context.
      if (childNode.classList.contains(EditorStyleHelper.table)) {
        const rows = childNode.querySelectorAll("tr");
        if (rows.length < 3) {
          continue;
        }

        let previousRowRemoved = false;
        let previousRowDiffClipped = false;

        for (const row of rows) {
          if (containsDiffElement(row)) {
            const cells = row.querySelectorAll("td");
            if (previousRowRemoved && previousRowDiffClipped) {
              const tr = doc.createElement("tr");
              const br = doc.createElement("td");
              br.colSpan = cells.length;
              br.innerHTML = "…";
              br.className = "diff-context-break";
              tr.appendChild(br);
              childNode.parentElement?.insertBefore(tr, childNode);
            }
            previousRowRemoved = false;
            previousRowDiffClipped = true;
            continue;
          }

          if (containsDiffElement(row.nextElementSibling)) {
            previousRowRemoved = false;
            continue;
          }

          if (containsDiffElement(row.previousElementSibling)) {
            previousRowRemoved = false;
            continue;
          }

          previousRowRemoved = true;
          row.remove();
        }
      }

      continue;
    }

    // If the block node does not contain a diff tag and the previous
    // block node did not contain a diff tag then remove the previous.
    if (
      childNode.nodeName === "P" &&
      childNode.textContent &&
      childNode.nextElementSibling?.nodeName === "P" &&
      containsDiffElement(childNode.nextElementSibling)
    ) {
      if (previousDiffClipped) {
        childNode.parentElement?.insertBefore(br.cloneNode(true), childNode);
      }
      previousNodeRemoved = false;
      continue;
    }
    if (
      childNode.nodeName === "P" &&
      childNode.textContent &&
      childNode.previousElementSibling?.nodeName === "P" &&
      containsDiffElement(childNode.previousElementSibling)
    ) {
      previousNodeRemoved = false;
      continue;
    }
    previousNodeRemoved = true;
    childNode.remove();
  }

  const head = doc.querySelector("head");
  const body = doc.querySelector("body");
  return `${head?.innerHTML} ${body?.innerHTML}`;
}
