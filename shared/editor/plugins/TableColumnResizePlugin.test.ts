import { Fragment, Slice } from "prosemirror-model";
import type { EditorState } from "prosemirror-state";
import { columnResizing, columnResizingPluginKey } from "prosemirror-tables";
import {
  createEditorState,
  doc,
  p,
  schema,
  table,
  td,
  tr,
} from "@shared/test/editor";
import { TableColumnResizePlugin } from "./TableColumnResizePlugin";

/** Position of the first cell in a document that starts with a table. */
const firstCellPos = 2;

function startResizing(state: EditorState, handle: number) {
  const withHandle = state.apply(
    state.tr.setMeta(columnResizingPluginKey, { setHandle: handle })
  );
  return withHandle.apply(
    withHandle.tr.setMeta(columnResizingPluginKey, {
      setDragging: { startX: 0, startWidth: 100 },
    })
  );
}

describe("TableColumnResizePlugin", () => {
  const createState = () =>
    createEditorState(doc(table([tr([td("A"), td("B")])])), [
      columnResizing(),
      new TableColumnResizePlugin(),
    ]);

  it("should cancel dragging when the document is replaced under the handle", () => {
    const state = startResizing(createState(), firstCellPos);
    expect(columnResizingPluginKey.getState(state)?.dragging).toBeTruthy();

    // Mimic the whole document replacement that y-prosemirror dispatches when a
    // remote change arrives, which invalidates the drag handle.
    const newState = state.apply(
      state.tr.replace(
        0,
        state.doc.content.size,
        new Slice(Fragment.from(p("Replaced")), 0, 0)
      )
    );

    const resizeState = columnResizingPluginKey.getState(newState);
    expect(resizeState?.activeHandle).toBe(-1);
    expect(resizeState?.dragging).toBe(null);
  });

  it("should keep dragging when the handle survives the change", () => {
    const state = startResizing(createState(), firstCellPos);

    const newState = state.apply(
      state.tr.insert(state.doc.content.size, schema.nodes.paragraph.create())
    );

    const resizeState = columnResizingPluginKey.getState(newState);
    expect(resizeState?.activeHandle).toBe(firstCellPos);
    expect(resizeState?.dragging).toBeTruthy();
  });
});
