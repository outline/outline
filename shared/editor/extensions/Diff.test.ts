import { EditorState } from "prosemirror-state";
import type { DecorationSet } from "prosemirror-view";
import Diff from "./Diff";
import { ChangesetHelper } from "../lib/ChangesetHelper";
import type { ProsemirrorData } from "../../types";

/**
 * Builds a document with a single checkbox list, one item per given state.
 */
function checkboxDoc(...checked: boolean[]): ProsemirrorData {
  return {
    type: "doc",
    content: [
      {
        type: "checkbox_list",
        content: checked.map((isChecked, index) => ({
          type: "checkbox_item",
          attrs: { checked: isChecked },
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: `Task number ${index}` }],
            },
          ],
        })),
      },
    ],
  } as ProsemirrorData;
}

/**
 * Builds a document with a single table row, one cell per given node type.
 */
function tableDoc(...cellTypes: string[]): ProsemirrorData {
  return {
    type: "doc",
    content: [
      {
        type: "table",
        content: [
          {
            type: "tr",
            content: cellTypes.map((type, index) => ({
              type,
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: `Cell ${index}` }],
                },
              ],
            })),
          },
        ],
      },
    ],
  } as ProsemirrorData;
}

/**
 * Builds the diff decorations for the changeset between two documents.
 */
function decorationsFor(after: ProsemirrorData, before: ProsemirrorData) {
  const changeset = ChangesetHelper.getChangeset(after, before);
  expect(changeset).not.toBeNull();

  const state = EditorState.create({
    doc: changeset!.doc,
    plugins: new Diff({ changes: changeset!.changes }).plugins,
  });

  const decorations = state.plugins[0].getState(state) as DecorationSet;
  return { decorations, doc: changeset!.doc };
}

describe("Diff", () => {
  it("decorates the modified node", () => {
    const { decorations, doc } = decorationsFor(
      checkboxDoc(true, false),
      checkboxDoc(false, false)
    );

    const firstItem = doc.child(0).child(0);
    expect(decorations.find()).toEqual([
      expect.objectContaining({ from: 1, to: 1 + firstItem.nodeSize }),
    ]);
  });

  it("keeps modification decorations within the document", () => {
    const cases: Array<[ProsemirrorData, ProsemirrorData]> = [
      [checkboxDoc(true, true, true), checkboxDoc(false, false, false)],
      [tableDoc("th", "th", "th"), tableDoc("td", "td", "td")],
    ];

    for (const [after, before] of cases) {
      const { decorations, doc } = decorationsFor(after, before);
      expect(decorations.find().length).toBeGreaterThan(0);
      for (const decoration of decorations.find()) {
        expect(decoration.from).toBeLessThanOrEqual(doc.content.size);
        expect(decoration.to).toBeLessThanOrEqual(doc.content.size);
      }
    }
  });
});
