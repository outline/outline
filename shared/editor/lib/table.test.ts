import { Schema } from "prosemirror-model";
import { isValidCellAlignment, isValidCellMarks } from "./table";

const schema = new Schema({
  nodes: {
    doc: { content: "text*" },
    text: {},
  },
  marks: {
    background: {
      attrs: { color: {} },
    },
    strong: {},
    em: {},
  },
});

describe("isValidCellAlignment", () => {
  it("accepts null", () => {
    expect(isValidCellAlignment(null)).toBe(true);
  });

  it("accepts the three allowed alignment strings", () => {
    expect(isValidCellAlignment("left")).toBe(true);
    expect(isValidCellAlignment("center")).toBe(true);
    expect(isValidCellAlignment("right")).toBe(true);
  });

  it("rejects arbitrary strings", () => {
    expect(isValidCellAlignment("justify")).toBe(false);
    expect(isValidCellAlignment("LEFT")).toBe(false);
    expect(isValidCellAlignment("")).toBe(false);
  });

  it("rejects CSS injection payloads", () => {
    expect(
      isValidCellAlignment(
        "left; background-image: url(https://evil.example/exfil)"
      )
    ).toBe(false);
    expect(isValidCellAlignment("left; background: red")).toBe(false);
  });

  it("rejects non-string non-null values", () => {
    expect(isValidCellAlignment(undefined)).toBe(false);
    expect(isValidCellAlignment(0)).toBe(false);
    expect(isValidCellAlignment({})).toBe(false);
    expect(isValidCellAlignment([])).toBe(false);
  });
});

describe("isValidCellMarks", () => {
  it("accepts undefined and null", () => {
    expect(isValidCellMarks(undefined)).toBe(true);
    expect(isValidCellMarks(null)).toBe(true);
  });

  it("accepts an empty array", () => {
    expect(isValidCellMarks([])).toBe(true);
  });

  it("accepts a background mark with a valid 6-digit hex color", () => {
    expect(
      isValidCellMarks(
        [{ type: "background", attrs: { color: "#FDEA9B" } }],
        schema
      )
    ).toBe(true);
  });

  it("accepts a background mark with a valid 8-digit hex color", () => {
    expect(
      isValidCellMarks(
        [{ type: "background", attrs: { color: "#FDEA9BB3" } }],
        schema
      )
    ).toBe(true);
  });

  it("accepts a background mark with a valid 3-digit hex color", () => {
    expect(
      isValidCellMarks(
        [{ type: "background", attrs: { color: "#fff" } }],
        schema
      )
    ).toBe(true);
  });

  it("accepts a background mark with a valid 4-digit hex color", () => {
    expect(
      isValidCellMarks(
        [{ type: "background", attrs: { color: "#fff8" } }],
        schema
      )
    ).toBe(true);
  });

  it("rejects a background mark with a malformed 4-digit hex color", () => {
    expect(
      isValidCellMarks(
        [{ type: "background", attrs: { color: "#fffz" } }],
        schema
      )
    ).toBe(false);
  });

  it("rejects a background mark with a non-hex color", () => {
    expect(
      isValidCellMarks(
        [{ type: "background", attrs: { color: "red" } }],
        schema
      )
    ).toBe(false);
  });

  it("rejects a background mark carrying a CSS injection payload", () => {
    expect(
      isValidCellMarks(
        [
          {
            type: "background",
            attrs: {
              color: "#fff; background-image: url(https://evil.example)",
            },
          },
        ],
        schema
      )
    ).toBe(false);
  });

  it("rejects a background mark with a missing color attr", () => {
    expect(isValidCellMarks([{ type: "background", attrs: {} }], schema)).toBe(
      false
    );
    expect(isValidCellMarks([{ type: "background" }], schema)).toBe(false);
  });

  it("rejects mark types that are not registered in the schema", () => {
    expect(isValidCellMarks([{ type: "not_a_mark" }], schema)).toBe(false);
  });

  it("does not check schema registration when no schema is provided", () => {
    expect(isValidCellMarks([{ type: "anything_goes" }])).toBe(true);
  });

  it("rejects non-array values", () => {
    expect(isValidCellMarks("marks")).toBe(false);
    expect(isValidCellMarks({})).toBe(false);
    expect(isValidCellMarks(42)).toBe(false);
  });

  it("rejects arrays containing malformed entries", () => {
    expect(isValidCellMarks([null], schema)).toBe(false);
    expect(isValidCellMarks(["strong"], schema)).toBe(false);
    expect(isValidCellMarks([{}], schema)).toBe(false);
    expect(isValidCellMarks([{ type: 123 }], schema)).toBe(false);
    expect(isValidCellMarks([{ type: "strong", attrs: "oops" }], schema)).toBe(
      false
    );
  });

  it("accepts registered marks without attrs", () => {
    expect(isValidCellMarks([{ type: "strong" }], schema)).toBe(true);
    expect(isValidCellMarks([{ type: "em" }], schema)).toBe(true);
  });
});
