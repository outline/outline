import { baseKeymap } from "prosemirror-commands";
import { Slice } from "prosemirror-model";
import { NodeSelection, TextSelection } from "prosemirror-state";
import type { Transaction } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { createEditorState, schema, serializer } from "@shared/test/editor";
import InlineAtomSpacer, {
  ZERO_WIDTH_SPACER,
  stripSpacersFromNode,
} from "./InlineAtomSpacer";
import TableCellInteraction from "./TableCellInteraction";

describe("InlineAtomSpacer", () => {
  const extension = new InlineAtomSpacer();
  const tableInteraction = new TableCellInteraction();
  const plugins = [...extension.plugins, ...tableInteraction.plugins];
  const image = schema.nodes.image.create({
    src: "https://example.com/test.png",
    alt: "test",
  });

  it("maintains exactly one spacer at every missing atom boundary", () => {
    const doc = schema.nodes.doc.create(null, [
      schema.nodes.paragraph.create(null, [image, image]),
      schema.nodes.paragraph.create(null, [schema.text("trigger")]),
    ]);
    const state = createEditorState(doc, plugins);
    const secondParagraphStart = doc.child(0).nodeSize + 1;
    const nextState = state.apply(
      state.tr.insertText("x", secondParagraphStart)
    );
    const paragraph = nextState.doc.firstChild;
    if (!paragraph) {
      throw new Error("Expected the first paragraph");
    }

    expect(paragraph.childCount).toBe(5);
    expect(paragraph.child(0).text).toBe(ZERO_WIDTH_SPACER);
    expect(paragraph.child(1).type.name).toBe("image");
    expect(paragraph.child(2).text).toBe(ZERO_WIDTH_SPACER);
    expect(paragraph.child(3).type.name).toBe("image");
    expect(paragraph.child(4).text).toBe(ZERO_WIDTH_SPACER);
  });

  it("removes orphan spacers after an atom is deleted", () => {
    const doc = schema.nodes.doc.create(null, [
      schema.nodes.paragraph.create(null, [
        schema.text(ZERO_WIDTH_SPACER),
        image,
        schema.text(ZERO_WIDTH_SPACER),
      ]),
    ]);
    let state = createEditorState(doc, plugins);
    state = state.apply(
      state.tr.setSelection(
        TextSelection.create(
          state.doc,
          findNodePosition(state.doc, "image") + image.nodeSize
        )
      )
    );

    const firstTransaction = runCommand(extension.keys().Backspace, state);
    state = state.apply(firstTransaction);
    expect(state.selection).toBeInstanceOf(NodeSelection);

    const secondTransaction = runCommand(baseKeymap.Backspace, state);
    state = state.apply(secondTransaction);
    expect(state.doc.textContent).toBe("");
    expect(state.doc.firstChild?.content.size).toBe(0);
  });

  it("uses the same two-step flow for forward deletion", () => {
    const doc = schema.nodes.doc.create(null, [
      schema.nodes.paragraph.create(null, [
        schema.text(ZERO_WIDTH_SPACER),
        image,
        schema.text(ZERO_WIDTH_SPACER),
      ]),
    ]);
    let state = createEditorState(doc, plugins);
    const imagePos = findNodePosition(state.doc, "image");
    state = state.apply(
      state.tr.setSelection(TextSelection.create(state.doc, imagePos))
    );

    state = state.apply(runCommand(extension.keys().Delete, state));
    expect(state.selection).toBeInstanceOf(NodeSelection);
    state = state.apply(runCommand(baseKeymap.Delete, state));
    expect(state.doc.firstChild?.content.size).toBe(0);
  });

  it("explicitly deletes a single character immediately before an atom", () => {
    const doc = schema.nodes.doc.create(null, [
      schema.nodes.paragraph.create(null, [
        schema.text("x"),
        image,
        schema.text(ZERO_WIDTH_SPACER),
      ]),
    ]);
    let state = createEditorState(doc, plugins);
    state = state.apply(
      state.tr.setSelection(TextSelection.create(state.doc, 2))
    );

    state = state.apply(runCommand(extension.keys().Backspace, state));
    expect(state.doc.textContent).not.toContain("x");
    expect(findNodePosition(state.doc, "image")).toBeGreaterThan(-1);
  });

  it("explicitly deletes a single character immediately before an atom with Delete", () => {
    const doc = schema.nodes.doc.create(null, [
      schema.nodes.paragraph.create(null, [
        schema.text("x"),
        image,
        schema.text(ZERO_WIDTH_SPACER),
      ]),
    ]);
    let state = createEditorState(doc, plugins);
    state = state.apply(
      state.tr.setSelection(TextSelection.create(state.doc, 1))
    );

    state = state.apply(runCommand(extension.keys().Delete, state));
    expect(state.doc.textContent).not.toContain("x");
    expect(findNodePosition(state.doc, "image")).toBeGreaterThan(-1);
  });

  it("splits a table paragraph at the image without intercepting body Enter", () => {
    const tableDoc = createTableDoc([
      schema.nodes.paragraph.create(null, [
        schema.text(ZERO_WIDTH_SPACER),
        image,
        schema.text(`${ZERO_WIDTH_SPACER}after`),
      ]),
    ]);
    let state = createEditorState(tableDoc, plugins);
    const imagePos = findNodePosition(state.doc, "image");
    state = state.apply(
      state.tr.setSelection(
        TextSelection.create(state.doc, imagePos + image.nodeSize)
      )
    );

    state = state.apply(runCommand(tableInteraction.keys().Enter, state));
    const cell = findNode(state.doc, "td");
    expect(cell?.childCount).toBe(2);
    expect(cell?.child(0).type.name).toBe("paragraph");
    expect(cell?.child(1).textContent).toBe("after");

    const bodyDoc = schema.nodes.doc.create(null, [
      schema.nodes.paragraph.create(null, [image]),
    ]);
    const bodyState = createEditorState(bodyDoc, plugins);
    expect(tableInteraction.keys().Enter(bodyState)).toBe(false);
  });

  it("splits below a selected table image", () => {
    const doc = createTableDoc([
      schema.nodes.paragraph.create(null, [
        schema.text(ZERO_WIDTH_SPACER),
        image,
        schema.text(ZERO_WIDTH_SPACER),
      ]),
    ]);
    let state = createEditorState(doc, plugins);
    const imagePos = findNodePosition(state.doc, "image");
    state = state.apply(
      state.tr.setSelection(NodeSelection.create(state.doc, imagePos))
    );

    state = state.apply(runCommand(tableInteraction.keys().Enter, state));
    expect(findNode(state.doc, "td")?.childCount).toBe(2);
  });

  it.skipIf(typeof document === "undefined")(
    "maps right and lower cell whitespace into the target cell",
    () => {
      const doc = createTableDoc([
        schema.nodes.paragraph.create(null, [
          schema.text(ZERO_WIDTH_SPACER),
          image,
          schema.text(ZERO_WIDTH_SPACER),
        ]),
      ]);
      const state = createEditorState(doc, plugins);
      const view = new EditorView(document.createElement("div"), { state });

      try {
        const imagePos = findNodePosition(view.state.doc, "image");
        const cellPos = findNodePosition(view.state.doc, "td");
        const imageDOM = view.nodeDOM(imagePos);
        const cellDOM = view.nodeDOM(cellPos);
        if (!(imageDOM instanceof HTMLElement)) {
          throw new Error("Expected image DOM");
        }
        if (!(cellDOM instanceof HTMLElement)) {
          throw new Error("Expected cell DOM");
        }

        const visibleImage = imageDOM.querySelector("img");
        const paragraph = cellDOM.querySelector("p");
        if (!visibleImage || !paragraph) {
          throw new Error("Expected rendered image and paragraph");
        }
        vi.spyOn(visibleImage, "getBoundingClientRect").mockReturnValue(
          new DOMRect(0, 0, 50, 30)
        );
        vi.spyOn(paragraph, "getBoundingClientRect").mockReturnValue(
          new DOMRect(0, 0, 100, 40)
        );

        const tablePlugin = tableInteraction.plugins[0];
        const handleClickOn = tablePlugin.props.handleClickOn;
        const cellNode = view.state.doc.nodeAt(cellPos);
        if (!handleClickOn || !cellNode) {
          throw new Error("Expected table-cell click handler");
        }
        const rightClick = new MouseEvent("click", {
          bubbles: true,
          clientX: 80,
          clientY: 10,
        });
        Object.defineProperty(rightClick, "target", { value: paragraph });
        expect(
          handleClickOn.call(
            tablePlugin,
            view,
            imagePos,
            cellNode,
            cellPos,
            rightClick,
            false
          )
        ).toBe(true);
        expect(view.state.selection).toBeInstanceOf(TextSelection);
        expect(view.state.selection.from).toBe(imagePos + image.nodeSize + 1);

        const lowerClick = new MouseEvent("click", {
          bubbles: true,
          clientX: 20,
          clientY: 80,
        });
        Object.defineProperty(lowerClick, "target", { value: cellDOM });
        expect(
          handleClickOn.call(
            tablePlugin,
            view,
            imagePos,
            cellNode,
            cellPos,
            lowerClick,
            false
          )
        ).toBe(true);
        expect(findNode(view.state.doc, "td")?.childCount).toBe(2);
        expect(view.state.selection.$from.node(-1).type.name).toBe("td");
      } finally {
        view.destroy();
      }
    }
  );

  it.skipIf(typeof document === "undefined")(
    "keeps clipboard, JSON, and Markdown output free of spacers",
    () => {
      const doc = schema.nodes.doc.create(null, [
        schema.nodes.paragraph.create(null, [
          schema.text(ZERO_WIDTH_SPACER),
          image,
          schema.text(`${ZERO_WIDTH_SPACER}after`),
        ]),
      ]);
      const view = new EditorView(document.createElement("div"), {
        state: createEditorState(doc, plugins),
      });

      try {
        const transformCopied = plugins[0].props.transformCopied;
        if (!transformCopied) {
          throw new Error("Expected clipboard sanitizer");
        }
        const copied = transformCopied.call(
          plugins[0],
          new Slice(view.state.doc.content, 0, 0),
          view
        );

        expect(
          copied.content.textBetween(0, copied.content.size)
        ).not.toContain(ZERO_WIDTH_SPACER);
        expect(
          JSON.stringify(stripSpacersFromNode(view.state.doc).toJSON())
        ).not.toContain(ZERO_WIDTH_SPACER);
        expect(serializer.serialize(view.state.doc)).not.toContain(
          ZERO_WIDTH_SPACER
        );

        const tableMarkdown = serializer.serialize(
          createTableDoc([
            schema.nodes.paragraph.create(null, [image]),
            schema.nodes.paragraph.create(null, [schema.text("after")]),
          ])
        );
        expect(tableMarkdown).toContain(
          "![test](https://example.com/test.png)<br>after"
        );
      } finally {
        view.destroy();
      }
    }
  );

  it("does not jump cursor to after the image when typing characters before the image", () => {
    const doc = schema.nodes.doc.create(null, [
      schema.nodes.paragraph.create(null, [
        schema.text(ZERO_WIDTH_SPACER),
        image,
        schema.text(ZERO_WIDTH_SPACER),
      ]),
    ]);
    let state = createEditorState(doc, plugins);
    // Selection before image (inside the first spacer text node)
    state = state.apply(
      state.tr.setSelection(TextSelection.create(state.doc, 1))
    );

    // Type first character 'n'
    state = state.apply(state.tr.insertText("n"));
    // The caret must stay before the image (at pos 2, after 'n')
    expect(state.selection.from).toBe(2);
    expect(state.doc.firstChild?.child(0).text).toContain("n");
    expect(state.doc.firstChild?.child(1).type.name).toBe("image");

    // Type second character 'i'
    state = state.apply(state.tr.insertText("i"));
    expect(state.selection.from).toBe(3);
    expect(state.doc.firstChild?.child(0).text).toContain("ni");
    expect(state.doc.firstChild?.child(1).type.name).toBe("image");

    // Trailing spacer after the image must remain untouched
    expect(state.doc.firstChild?.child(2).text).toBe(ZERO_WIDTH_SPACER);
  });

  it("does not interrupt composition or jump cursor when typing behind the image", () => {
    const doc = schema.nodes.doc.create(null, [
      schema.nodes.paragraph.create(null, [
        schema.text(ZERO_WIDTH_SPACER),
        image,
        schema.text(ZERO_WIDTH_SPACER),
      ]),
    ]);
    let state = createEditorState(doc, plugins);
    const imagePos = findNodePosition(state.doc, "image");
    // Selection after image in trailing spacer
    state = state.apply(
      state.tr.setSelection(
        TextSelection.create(state.doc, imagePos + image.nodeSize)
      )
    );

    // Type first character
    state = state.apply(state.tr.insertText("n"));
    expect(state.doc.firstChild?.child(0).text).toBe(ZERO_WIDTH_SPACER);
    expect(state.doc.firstChild?.child(1).type.name).toBe("image");
    expect(state.doc.firstChild?.child(2).text).toContain("n");

    // Type second character
    state = state.apply(state.tr.insertText("i"));
    expect(state.doc.firstChild?.child(2).text).toContain("ni");
  });

  it.skipIf(typeof document === "undefined")(
    "maps click left of image to before the atom",
    () => {
      const doc = createTableDoc([
        schema.nodes.paragraph.create(null, [
          schema.text(ZERO_WIDTH_SPACER),
          image,
          schema.text(ZERO_WIDTH_SPACER),
        ]),
      ]);
      const state = createEditorState(doc, plugins);
      const view = new EditorView(document.createElement("div"), { state });

      try {
        const imagePos = findNodePosition(view.state.doc, "image");
        const cellPos = findNodePosition(view.state.doc, "td");
        const imageDOM = view.nodeDOM(imagePos);
        const cellDOM = view.nodeDOM(cellPos);
        if (
          !(imageDOM instanceof HTMLElement) ||
          !(cellDOM instanceof HTMLElement)
        ) {
          throw new Error("Expected DOM elements");
        }

        const visibleImage = imageDOM.querySelector("img");
        const paragraph = cellDOM.querySelector("p");
        if (!visibleImage || !paragraph) {
          throw new Error("Expected elements");
        }
        vi.spyOn(visibleImage, "getBoundingClientRect").mockReturnValue(
          new DOMRect(40, 0, 50, 30)
        );

        const tablePlugin = tableInteraction.plugins[0];
        const handleClickOn = tablePlugin.props.handleClickOn;
        const cellNode = view.state.doc.nodeAt(cellPos);
        if (!handleClickOn || !cellNode) {
          throw new Error("Expected handler");
        }

        // Click at x=10 (to the left of image at x=40)
        const leftClick = new MouseEvent("click", {
          bubbles: true,
          clientX: 10,
          clientY: 10,
        });
        Object.defineProperty(leftClick, "target", { value: paragraph });
        expect(
          handleClickOn.call(
            tablePlugin,
            view,
            imagePos,
            cellNode,
            cellPos,
            leftClick,
            false
          )
        ).toBe(true);
        expect(view.state.selection.from).toBe(imagePos);
      } finally {
        view.destroy();
      }
    }
  );

  it("deletes empty paragraph before image in table cell on Backspace", () => {
    const doc = createTableDoc([
      schema.nodes.paragraph.create(),
      schema.nodes.paragraph.create(null, [
        schema.text(ZERO_WIDTH_SPACER),
        image,
        schema.text(ZERO_WIDTH_SPACER),
      ]),
    ]);
    let state = createEditorState(doc, plugins);
    const cellBefore = findNode(state.doc, "td");
    expect(cellBefore?.childCount).toBe(2);

    // Cursor at the start of the image paragraph
    const imagePos = findNodePosition(state.doc, "image");
    state = state.apply(
      state.tr.setSelection(TextSelection.create(state.doc, imagePos))
    );

    // Press Backspace in table cell
    const tr = runCommand(tableInteraction.keys().Backspace, state);
    state = state.apply(tr);

    const cellAfter = findNode(state.doc, "td");
    expect(cellAfter?.childCount).toBe(1);
    expect(findNodePosition(state.doc, "image")).toBeGreaterThan(-1);
  });

  it("deletes empty paragraph directly inside table cell on Backspace", () => {
    const doc = createTableDoc([
      schema.nodes.paragraph.create(),
      schema.nodes.paragraph.create(null, [schema.text("after")]),
    ]);
    let state = createEditorState(doc, plugins);
    // Focus inside first empty paragraph
    state = state.apply(
      state.tr.setSelection(TextSelection.near(state.doc.resolve(3), 1))
    );

    const tr = runCommand(tableInteraction.keys().Backspace, state);
    state = state.apply(tr);

    const cellAfter = findNode(state.doc, "td");
    expect(cellAfter?.childCount).toBe(1);
    expect(cellAfter?.child(0).textContent).toBe("after");
  });

  it("navigates across table image with ArrowRight and ArrowLeft providing visible selection and caret anchor", () => {
    const doc = createTableDoc([
      schema.nodes.paragraph.create(null, [
        schema.text(ZERO_WIDTH_SPACER),
        image,
        schema.text(ZERO_WIDTH_SPACER),
      ]),
    ]);
    let state = createEditorState(doc, plugins);
    const imagePos = findNodePosition(state.doc, "image");

    // 1. Cursor before image in leading spacer
    state = state.apply(
      state.tr.setSelection(TextSelection.create(state.doc, imagePos))
    );

    // 2. Press ArrowRight -> selects image
    state = state.apply(runCommand(tableInteraction.keys().ArrowRight, state));
    expect(state.selection).toBeInstanceOf(NodeSelection);
    expect(state.selection.from).toBe(imagePos);

    // 3. Press ArrowRight again -> moves cursor to trailing spacer (after image + spacer nodeSize)
    state = state.apply(runCommand(tableInteraction.keys().ArrowRight, state));
    expect(state.selection).toBeInstanceOf(TextSelection);
    expect(state.selection.from).toBe(imagePos + image.nodeSize + 1);

    // 4. Press ArrowLeft -> selects image again
    state = state.apply(runCommand(tableInteraction.keys().ArrowLeft, state));
    expect(state.selection).toBeInstanceOf(NodeSelection);
    expect(state.selection.from).toBe(imagePos);

    // 5. Press ArrowLeft again -> moves cursor to leading spacer (before image)
    state = state.apply(runCommand(tableInteraction.keys().ArrowLeft, state));
    expect(state.selection).toBeInstanceOf(TextSelection);
    expect(state.selection.from).toBe(imagePos);
  });

  it.skipIf(typeof document === "undefined")(
    "does not intercept clicks on real text adjacent to an image in a table cell",
    () => {
      const doc = createTableDoc([
        schema.nodes.paragraph.create(null, [
          image,
          schema.text("Hello world"),
        ]),
      ]);
      const state = createEditorState(doc, plugins);
      const cellNode = findNode(state.doc, "td");
      if (!cellNode) {
        throw new Error("Expected td");
      }

      const tablePlugin = tableInteraction.plugins[0];
      const handleClickOn = tablePlugin.props.handleClickOn;
      if (!handleClickOn) {
        throw new Error("Expected handleClickOn");
      }

      const view = new EditorView(document.createElement("div"), { state });

      try {
        const cellPos = findNodePosition(view.state.doc, "td");
        const cell = view.nodeDOM(cellPos);
        if (!(cell instanceof HTMLElement)) {
          throw new Error("Expected table-cell DOM element");
        }
        const dispatch = vi.spyOn(view, "dispatch");
        vi.spyOn(view, "posAtCoords").mockReturnValue({
          pos: findNodePosition(view.state.doc, "image") + image.nodeSize + 3,
          inside: -1,
        });
        const event = new MouseEvent("click", {
          bubbles: true,
          clientX: 200,
          clientY: 50,
        });
        Object.defineProperty(event, "target", { value: cell });

        const handled = handleClickOn.call(
          tablePlugin,
          view,
          1,
          cellNode,
          cellPos,
          event,
          true
        );
        expect(handled).toBe(false);
        expect(dispatch).not.toHaveBeenCalled();
      } finally {
        view.destroy();
      }
    }
  );
});

function createTableDoc(
  children: Parameters<typeof schema.nodes.td.create>[1]
) {
  return schema.nodes.doc.create(null, [
    schema.nodes.table.create(null, [
      schema.nodes.tr.create(null, [schema.nodes.td.create(null, children)]),
    ]),
  ]);
}

function runCommand(
  command: NonNullable<ReturnType<InlineAtomSpacer["keys"]>[string]>,
  state: ReturnType<typeof createEditorState>
): Transaction {
  let transaction: Transaction | undefined;
  const handled = command(state, (nextTransaction) => {
    transaction = nextTransaction;
  });
  expect(handled).toBe(true);
  if (!transaction) {
    throw new Error("Expected command transaction");
  }
  return transaction;
}

function findNodePosition(
  doc: ReturnType<typeof schema.node>,
  name: string
): number {
  let found = -1;
  doc.descendants((node, pos) => {
    if (node.type.name === name) {
      found = pos;
      return false;
    }
    return true;
  });
  return found;
}

function findNode(doc: ReturnType<typeof schema.node>, name: string) {
  let found: ReturnType<typeof schema.node> | undefined;
  doc.descendants((node) => {
    if (node.type.name === name) {
      found = node;
      return false;
    }
    return true;
  });
  return found;
}
