import { sharedModelPath } from "./routeHelpers";

describe("#sharedModelPath", () => {
  const shareId = "1c922644-40d8-41fe-98f9-df2b67239d45";

  it("should prefix the model path with the share route", () => {
    expect(sharedModelPath(shareId)).toBe(`/s/${shareId}`);
    expect(sharedModelPath(shareId, "/doc/test-DjDlkBi77t")).toBe(
      `/s/${shareId}/doc/test-DjDlkBi77t`
    );
  });

  it("should not prefix when the share is the root share", () => {
    expect(sharedModelPath(shareId, undefined, shareId)).toBe("/");
    expect(sharedModelPath(shareId, "/doc/test-DjDlkBi77t", shareId)).toBe(
      "/doc/test-DjDlkBi77t"
    );
  });
});
