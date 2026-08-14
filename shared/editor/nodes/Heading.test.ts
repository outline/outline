// @vitest-environment jsdom
import { Schema } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import Heading from "./Heading";

const heading = new Heading();

const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    heading: heading.schema,
    paragraph: { content: "inline*", group: "block", toDOM: () => ["p", 0] },
    text: { group: "inline" },
  },
});

const mountDoc = (...nodes: ReturnType<typeof schema.node>[]) => {
  const mount = document.createElement("div");
  document.body.appendChild(mount);

  return new EditorView(mount, {
    state: EditorState.create({
      doc: schema.node("doc", null, nodes),
      schema,
      plugins: heading.plugins,
    }),
  });
};

const mountView = () =>
  mountDoc(
    schema.node("heading", { level: 1 }, [schema.text("A")]),
    schema.node("heading", { level: 2 }, [schema.text("Second")])
  );

const anchors = (view: EditorView) =>
  Array.from(view.dom.querySelectorAll<HTMLElement>("button.heading-anchor"));

/** Tags the mounted anchors so a later read shows whether they were replaced. */
const tagAnchors = (view: EditorView) => {
  const mounted = anchors(view);
  expect(mounted).toHaveLength(2);
  mounted.forEach((anchor, index) => {
    anchor.dataset.tag = String(index);
  });
};

const readTags = (view: EditorView) =>
  anchors(view).map((anchor) => anchor.dataset.tag);

describe("Heading", () => {
  // Replacing the anchor rewrites the heading contents on every keystroke, which
  // discards text an IME is still composing.
  it("keeps the anchor element when the heading is edited", () => {
    const view = mountView();
    tagAnchors(view);

    view.dispatch(view.state.tr.insertText("B", 2));

    expect(readTags(view)).toEqual(["0", "1"]);
    view.destroy();
  });

  it("keeps the anchor element when an earlier heading changes length", () => {
    const view = mountView();
    tagAnchors(view);

    // Shifts the position of every node after the first heading.
    view.dispatch(view.state.tr.insertText("BCD", 2));

    expect(readTags(view)).toEqual(["0", "1"]);
    view.destroy();
  });

  it("keeps the anchor element when the heading text node is replaced", () => {
    const view = mountView();
    tagAnchors(view);

    view.dispatch(view.state.tr.delete(1, 2));
    view.dispatch(view.state.tr.insertText("Z", 1));

    expect(readTags(view)).toEqual(["0", "1"]);
    view.destroy();
  });

  // The anchor widgets share a decoration key, so check that each heading still
  // gets exactly one anchor of its own when the document structure changes.
  describe("gives every heading its own anchor", () => {
    const countPerHeading = (view: EditorView) => {
      const headings = Array.from(view.dom.querySelectorAll("h1,h2,h3,h4"));
      return headings.map(
        (element) => element.querySelectorAll("button.heading-anchor").length
      );
    };

    const expectOneEach = (view: EditorView, count: number) => {
      expect(countPerHeading(view)).toEqual(Array(count).fill(1));
      expect(new Set(anchors(view)).size).toBe(count);
    };

    it("for two headings with identical content", () => {
      const view = mountDoc(
        schema.node("heading", { level: 1 }, [schema.text("Same")]),
        schema.node("heading", { level: 1 }, [schema.text("Same")])
      );
      expectOneEach(view, 2);

      view.dispatch(view.state.tr.delete(0, 6));

      expectOneEach(view, 1);
      view.destroy();
    });

    it("after a heading is split in two", () => {
      const view = mountDoc(
        schema.node("heading", { level: 1 }, [schema.text("AB")])
      );

      view.dispatch(view.state.tr.split(2));

      expectOneEach(view, 2);
      view.destroy();
    });

    it("after a paragraph between headings becomes a heading", () => {
      const view = mountDoc(
        schema.node("heading", { level: 1 }, [schema.text("One")]),
        schema.node("paragraph", null, [schema.text("Mid")]),
        schema.node("heading", { level: 2 }, [schema.text("Two")])
      );
      expectOneEach(view, 2);

      view.dispatch(
        view.state.tr.setNodeMarkup(5, schema.nodes.heading, { level: 3 })
      );

      expectOneEach(view, 3);
      view.destroy();
    });
  });
});
