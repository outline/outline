import { sharedModelPath, desktopify } from "./routeHelpers";

describe("#sharedDocumentPath", () => {
  test("should return share path for a document", () => {
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
  test("should replace https protocol with outline://", () => {
    Object.defineProperty(window, "location", {
      value: { origin: "https://app.getoutline.com" },
      writable: true,
    });
    expect(desktopify("/doc/test-DjDlkBi77t")).toBe(
      "outline://app.getoutline.com/doc/test-DjDlkBi77t"
    );
  });

  test("should replace http protocol with outline://", () => {
    Object.defineProperty(window, "location", {
      value: { origin: "http://localhost:3000" },
      writable: true,
    });
    expect(desktopify("/doc/test-DjDlkBi77t")).toBe(
      "outline://localhost:3000/doc/test-DjDlkBi77t"
    );
  });
});
