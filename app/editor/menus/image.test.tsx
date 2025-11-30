import { EditorState } from "prosemirror-state";
import { Schema } from "prosemirror-model";
import Desktop from "~/utils/Desktop";
import imageMenuItems from "./image";

jest.mock("~/utils/Desktop");

const mockDictionary = {
  alignLeft: "Align left",
  alignCenter: "Align center",
  alignRight: "Align right",
  alignFullWidth: "Full width",
  dimensions: "Dimensions",
  downloadImage: "Download",
  replaceImage: "Replace",
  uploadImage: "Upload",
  editImageUrl: "Edit URL",
  deleteImage: "Delete",
  comment: "Comment",
};

// Create a minimal schema for testing
const testSchema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: { group: "block", content: "inline*" },
    text: { group: "inline" },
    image: {
      group: "inline",
      inline: true,
      attrs: {
        src: { default: "" },
        source: { default: null },
        layoutClass: { default: null },
      },
    },
  },
});

describe("imageMenuItems", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it("should include editDiagram item for diagrams when not in desktop app", () => {
    (Desktop.isElectron as jest.Mock).mockReturnValue(false);

    const doc = testSchema.node("doc", null, [
      testSchema.node("paragraph"),
    ]);
    const state = EditorState.create({
      schema: testSchema,
      doc,
    });

    const items = imageMenuItems(state, false, mockDictionary);
    const editDiagramItem = items.find((item) => item.name === "editDiagram");

    expect(editDiagramItem).toBeDefined();
  });

  it("should exclude editDiagram item when in desktop app", () => {
    (Desktop.isElectron as jest.Mock).mockReturnValue(true);

    const doc = testSchema.node("doc", null, [
      testSchema.node("paragraph"),
    ]);
    const state = EditorState.create({
      schema: testSchema,
      doc,
    });

    const items = imageMenuItems(state, false, mockDictionary);
    const editDiagramItem = items.find((item) => item.name === "editDiagram");

    expect(editDiagramItem).toBeUndefined();
  });

  it("should return empty array when readOnly is true", () => {
    (Desktop.isElectron as jest.Mock).mockReturnValue(false);

    const doc = testSchema.node("doc", null, [
      testSchema.node("paragraph"),
    ]);
    const state = EditorState.create({
      schema: testSchema,
      doc,
    });

    const items = imageMenuItems(state, true, mockDictionary);

    expect(items).toEqual([]);
  });
});
