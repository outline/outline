import {
  desktopify,
  legacyNotebookPath,
  sharedModelPath,
} from "./routeHelpers";
describe("#sharedDocumentPath", () => {
  it("should return share path for a document", () => {
    const shareId = "1c922644-40d8-41fe-98f9-df2b67239d45";
    const docPath = "/doc/test-DjDlkBi77t";
    expect(sharedModelPath(shareId)).toBe(
      "/s/1c922644-40d8-41fe-98f9-df2b67239d45"
    );
    expect(sharedModelPath(shareId, docPath)).toBe(
      "/s/1c922644-40d8-41fe-98f9-df2b67239d45/doc/test-DjDlkBi77t"
    );
  });
});
describe("#desktopify", () => {
  it("should replace https protocol with outline://", () => {
    expect(
      desktopify("/doc/test-DjDlkBi77t", "https://app.getoutline.com")
    ).toBe("outline://app.getoutline.com/doc/test-DjDlkBi77t");
  });
  it("should replace http protocol with outline://", () => {
    expect(desktopify("/doc/test-DjDlkBi77t", "http://localhost:3000")).toBe(
      "outline://localhost:3000/doc/test-DjDlkBi77t"
    );
  });
});
describe("#legacyNotebookPath", () => {
  it("should preserve the legacy path suffix and location details", () => {
    expect(
      legacyNotebookPath(
        "/collections/team-notes-abc123/overview",
        "?tab=members",
        "#permissions"
      )
    ).toBe("/notebook/team-notes-abc123/overview?tab=members#permissions");
  });
  it("should support the singular legacy path", () => {
    expect(legacyNotebookPath("/collection/team-notes-abc123")).toBe(
      "/notebook/team-notes-abc123"
    );
  });
});
