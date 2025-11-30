import Desktop from "~/utils/Desktop";
import blockMenuItems from "./block";

jest.mock("~/utils/Desktop");

const mockDictionary = {
  h1: "Heading 1",
  h2: "Heading 2",
  h3: "Heading 3",
  h4: "Heading 4",
  checkboxList: "Todo List",
  bulletList: "Bulleted List",
  orderedList: "Ordered List",
  image: "Image",
  video: "Video",
  file: "File",
  table: "Table",
  quote: "Quote",
  codeBlock: "Code Block",
  mathBlock: "Math Block",
  hr: "Divider",
  pageBreak: "Page Break",
  insertDate: "Date",
  insertTime: "Time",
  insertDateTime: "Date & Time",
  infoNotice: "Info",
  successNotice: "Success",
  warningNotice: "Warning",
  tipNotice: "Tip",
};

describe("blockMenuItems", () => {
  const mockDocumentRef = {
    current: { clientWidth: 800 },
  } as React.RefObject<HTMLDivElement>;

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("should include Diagrams.net item when not in desktop app", () => {
    (Desktop.isElectron as jest.Mock).mockReturnValue(false);

    const items = blockMenuItems(mockDictionary, mockDocumentRef);
    const diagramItem = items.find((item) => item.name === "editDiagram");

    expect(diagramItem).toBeDefined();
    expect(diagramItem?.title).toBe("Diagrams.net Diagram");
  });

  it("should exclude Diagrams.net item when in desktop app", () => {
    (Desktop.isElectron as jest.Mock).mockReturnValue(true);

    const items = blockMenuItems(mockDictionary, mockDocumentRef);
    const diagramItem = items.find((item) => item.name === "editDiagram");

    expect(diagramItem).toBeUndefined();
  });

  it("should include Mermaid diagram in both environments", () => {
    (Desktop.isElectron as jest.Mock).mockReturnValue(false);
    const itemsWeb = blockMenuItems(mockDictionary, mockDocumentRef);
    const mermaidWeb = itemsWeb.find(
      (item) =>
        item.name === "code_block" && item.attrs?.language === "mermaidjs"
    );

    (Desktop.isElectron as jest.Mock).mockReturnValue(true);
    const itemsDesktop = blockMenuItems(mockDictionary, mockDocumentRef);
    const mermaidDesktop = itemsDesktop.find(
      (item) =>
        item.name === "code_block" && item.attrs?.language === "mermaidjs"
    );

    expect(mermaidWeb).toBeDefined();
    expect(mermaidDesktop).toBeDefined();
  });
});
