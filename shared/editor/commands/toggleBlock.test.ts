import type { Node } from "prosemirror-model";
import {
  createEditorState,
  doc,
  heading,
  p,
  schema,
  findNodes,
} from "@shared/test/editor";
import { convertHeadingsToToggleBlocks } from "./toggleBlock";

const { container_toggle } = schema.nodes;

/**
 * Creates a toggle block node with the given block content.
 */
function toggle(content: Node[], id = "test-id") {
  return container_toggle.create({ id }, content);
}

/**
 * Runs the convertHeadingsToToggleBlocks command against the given document
 * and returns the resulting document.
 */
function run(testDoc: Node) {
  let state = createEditorState(testDoc);
  const handled = convertHeadingsToToggleBlocks(state, (tr) => {
    state = state.apply(tr);
  });
  return { doc: state.doc, handled };
}

describe("convertHeadingsToToggleBlocks", () => {
  it("wraps a heading and its following content in a toggle block", () => {
    const { doc: result, handled } = run(
      doc([heading("Title", 1), p("one"), p("two")])
    );

    expect(handled).toBe(true);
    expect(result.childCount).toBe(1);

    const block = result.firstChild!;
    expect(block.type.name).toBe("container_toggle");
    expect(block.childCount).toBe(3);
    expect(block.child(0).type.name).toBe("heading");
    expect(block.child(0).textContent).toBe("Title");
    expect(block.child(1).textContent).toBe("one");
    expect(block.child(2).textContent).toBe("two");
  });

  it("nests lower level headings inside the toggle of a higher level heading", () => {
    const { doc: result } = run(
      doc([heading("Outer", 1), p("intro"), heading("Inner", 2), p("detail")])
    );

    expect(result.childCount).toBe(1);

    const outer = result.firstChild!;
    expect(outer.type.name).toBe("container_toggle");
    expect(outer.child(0).textContent).toBe("Outer");
    expect(outer.child(1).textContent).toBe("intro");

    const inner = outer.child(2);
    expect(inner.type.name).toBe("container_toggle");
    expect(inner.child(0).type.name).toBe("heading");
    expect(inner.child(0).textContent).toBe("Inner");
    expect(inner.child(1).textContent).toBe("detail");
  });

  it("creates sibling toggles for consecutive headings of the same level", () => {
    const { doc: result } = run(
      doc([heading("First", 2), p("one"), heading("Second", 2), p("two")])
    );

    expect(result.childCount).toBe(2);
    result.forEach((block, _offset, index) => {
      expect(block.type.name).toBe("container_toggle");
      expect(block.child(0).textContent).toBe(index === 0 ? "First" : "Second");
      expect(block.child(1).textContent).toBe(index === 0 ? "one" : "two");
    });
  });

  it("leaves content before the first heading in place", () => {
    const { doc: result } = run(doc([p("preamble"), heading("Title", 1)]));

    expect(result.childCount).toBe(2);
    expect(result.child(0).type.name).toBe("paragraph");
    expect(result.child(1).type.name).toBe("container_toggle");
  });

  it("skips headings that are already the head of a toggle block", () => {
    const testDoc = doc([toggle([heading("Existing", 1), p("body")])]);
    const { doc: result, handled } = run(testDoc);

    expect(handled).toBe(false);
    expect(result.toJSON()).toEqual(testDoc.toJSON());
  });

  it("converts headings inside the body of an existing toggle block", () => {
    const { doc: result } = run(
      doc([toggle([p("head"), heading("Nested", 2), p("body")])])
    );

    const toggles = findNodes(result.toJSON(), "container_toggle");
    expect(toggles.length).toBe(2);

    const outer = result.firstChild!;
    expect(outer.child(0).textContent).toBe("head");

    const inner = outer.child(1);
    expect(inner.type.name).toBe("container_toggle");
    expect(inner.child(0).type.name).toBe("heading");
    expect(inner.child(0).textContent).toBe("Nested");
    expect(inner.child(1).textContent).toBe("body");
  });

  it("assigns a unique id to each created toggle block", () => {
    const { doc: result } = run(
      doc([heading("First", 1), heading("Second", 1)])
    );

    const ids = findNodes(result.toJSON(), "container_toggle").map(
      (node) => node.attrs?.id
    );
    expect(ids.length).toBe(2);
    expect(ids[0]).toBeTruthy();
    expect(ids[1]).toBeTruthy();
    expect(ids[0]).not.toEqual(ids[1]);
  });

  it("returns false when the document has no headings", () => {
    const testDoc = doc([p("one"), p("two")]);
    const { doc: result, handled } = run(testDoc);

    expect(handled).toBe(false);
    expect(result.toJSON()).toEqual(testDoc.toJSON());
  });
});
