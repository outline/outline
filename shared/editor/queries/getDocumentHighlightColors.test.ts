import { schema, createEditorState, doc, p } from "@shared/test/editor";
import { getDocumentHighlightColors } from "./getDocumentHighlightColors";

describe("getDocumentHighlightColors", () => {
  it("returns empty array when no highlights exist", () => {
    const testDoc = doc([p("Plain text without highlights")]);
    const state = createEditorState(testDoc);
    
    const colors = getDocumentHighlightColors(state);
    
    expect(colors).toEqual([]);
  });

  it("returns unique highlight colors from document", () => {
    // Create text with highlight marks
    const highlightMark1 = schema.marks.highlight.create({ color: "#FDEA9B" });
    const highlightMark2 = schema.marks.highlight.create({ color: "#FED46A" });
    
    const text1 = schema.text("Highlighted text 1", [highlightMark1]);
    const text2 = schema.text(" and more ", [highlightMark2]);
    const text3 = schema.text("and again", [highlightMark1]);
    
    const testDoc = doc([
      schema.nodes.paragraph.create(null, [text1, text2, text3])
    ]);
    const state = createEditorState(testDoc);
    
    const colors = getDocumentHighlightColors(state);
    
    expect(colors).toHaveLength(2);
    expect(colors).toContain("#FDEA9B");
    expect(colors).toContain("#FED46A");
  });

  it("deduplicates colors used multiple times", () => {
    const highlightMark = schema.marks.highlight.create({ color: "#FDEA9B" });
    
    const text1 = schema.text("First highlight", [highlightMark]);
    const text2 = schema.text("Second highlight", [highlightMark]);
    
    const testDoc = doc([
      schema.nodes.paragraph.create(null, [text1]),
      schema.nodes.paragraph.create(null, [text2])
    ]);
    const state = createEditorState(testDoc);
    
    const colors = getDocumentHighlightColors(state);
    
    expect(colors).toHaveLength(1);
    expect(colors).toContain("#FDEA9B");
  });

  it("returns multiple different colors from multiple paragraphs", () => {
    const highlightMark1 = schema.marks.highlight.create({ color: "#FDEA9B" });
    const highlightMark2 = schema.marks.highlight.create({ color: "#FED46A" });
    const highlightMark3 = schema.marks.highlight.create({ color: "#FA551E" });
    
    const text1 = schema.text("First paragraph", [highlightMark1]);
    const text2 = schema.text("Second paragraph", [highlightMark2]);
    const text3 = schema.text("Third paragraph", [highlightMark3]);
    
    const testDoc = doc([
      schema.nodes.paragraph.create(null, [text1]),
      schema.nodes.paragraph.create(null, [text2]),
      schema.nodes.paragraph.create(null, [text3])
    ]);
    const state = createEditorState(testDoc);
    
    const colors = getDocumentHighlightColors(state);
    
    expect(colors).toHaveLength(3);
    expect(colors).toContain("#FDEA9B");
    expect(colors).toContain("#FED46A");
    expect(colors).toContain("#FA551E");
  });

  it("ignores text with other marks but no highlight", () => {
    const boldMark = schema.marks.strong.create();
    const highlightMark = schema.marks.highlight.create({ color: "#FDEA9B" });
    
    const boldText = schema.text("Bold text", [boldMark]);
    const highlightedText = schema.text("Highlighted text", [highlightMark]);
    
    const testDoc = doc([
      schema.nodes.paragraph.create(null, [boldText, highlightedText])
    ]);
    const state = createEditorState(testDoc);
    
    const colors = getDocumentHighlightColors(state);
    
    expect(colors).toHaveLength(1);
    expect(colors).toContain("#FDEA9B");
  });
});
