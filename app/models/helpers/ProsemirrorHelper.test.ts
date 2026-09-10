import type { ProsemirrorData } from "@shared/types";
import { ProsemirrorHelper } from "./ProsemirrorHelper";

const heading = (text: string, level: number) => ({
  type: "heading",
  attrs: { level },
  content: [{ type: "text", text }],
});

const document = (...content: object[]) => ({
  data: { type: "doc", content } as ProsemirrorData,
});

describe("getHeadingTitle", () => {
  it("finds the heading that an anchor points at", () => {
    expect(
      ProsemirrorHelper.getHeadingTitle(
        document(heading("Q3 goals", 2)),
        "h-q3-goals"
      )
    ).toBe("Q3 goals");
  });

  it("finds a heading through the percent encoding a url puts on its anchor", () => {
    expect(
      ProsemirrorHelper.getHeadingTitle(
        document(heading("\u306b\u307b\u3093\u3054", 2)),
        "h-%E3%81%AB%E3%81%BB%E3%82%93%E3%81%94"
      )
    ).toBe("\u306b\u307b\u3093\u3054");
  });

  it("returns undefined when the heading no longer exists", () => {
    expect(
      ProsemirrorHelper.getHeadingTitle(
        document(heading("Q4 goals", 2)),
        "h-q3-goals"
      )
    ).toBeUndefined();
  });

  it("distinguishes repeated headings by the suffix on their anchor", () => {
    const repeated = document(
      heading("Goals", 2),
      heading("Timeline", 2),
      heading("Goals", 3)
    );

    expect(ProsemirrorHelper.getHeadingTitle(repeated, "h-goals-1")).toBe(
      "Goals"
    );
    expect(
      ProsemirrorHelper.getHeadingTitle(repeated, "h-goals-2")
    ).toBeUndefined();
  });
});
