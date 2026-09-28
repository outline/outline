import { ByteRangeHelper } from "./ByteRangeHelper";

const { unsatisfiable } = ByteRangeHelper;

describe("ByteRangeHelper.parse", () => {
  it("should serve the whole file when no header is present", () => {
    expect(ByteRangeHelper.parse(undefined, 100)).toBeUndefined();
    expect(ByteRangeHelper.parse("", 100)).toBeUndefined();
  });

  it("should serve the whole file when the header is malformed", () => {
    expect(ByteRangeHelper.parse("bytes=abc-", 100)).toBeUndefined();
    expect(ByteRangeHelper.parse("bytes=-", 100)).toBeUndefined();
    expect(ByteRangeHelper.parse("items=0-1", 100)).toBeUndefined();
    expect(ByteRangeHelper.parse("0-1", 100)).toBeUndefined();
  });

  it("should serve the whole file when multiple ranges are requested", () => {
    expect(ByteRangeHelper.parse("bytes=0-1, 10-20", 100)).toBeUndefined();
  });

  it("should parse a closed range", () => {
    expect(ByteRangeHelper.parse("bytes=0-1", 100)).toEqual({
      start: 0,
      end: 1,
    });
    expect(ByteRangeHelper.parse("bytes=10-20", 100)).toEqual({
      start: 10,
      end: 20,
    });
  });

  it("should parse a single byte range", () => {
    expect(ByteRangeHelper.parse("bytes=0-0", 100)).toEqual({
      start: 0,
      end: 0,
    });
    expect(ByteRangeHelper.parse("bytes=99-99", 100)).toEqual({
      start: 99,
      end: 99,
    });
  });

  it("should tolerate surrounding whitespace", () => {
    expect(ByteRangeHelper.parse(" bytes=0-1 ", 100)).toEqual({
      start: 0,
      end: 1,
    });
  });

  it("should parse an open ended range", () => {
    expect(ByteRangeHelper.parse("bytes=10-", 100)).toEqual({
      start: 10,
      end: 99,
    });
  });

  it("should parse a suffix range", () => {
    expect(ByteRangeHelper.parse("bytes=-10", 100)).toEqual({
      start: 90,
      end: 99,
    });
  });

  it("should clamp a suffix range longer than the file", () => {
    expect(ByteRangeHelper.parse("bytes=-500", 100)).toEqual({
      start: 0,
      end: 99,
    });
  });

  it("should clamp a range that runs past the end of the file", () => {
    expect(ByteRangeHelper.parse("bytes=0-1000", 100)).toEqual({
      start: 0,
      end: 99,
    });
  });

  it("should be unsatisfiable when the range starts past the end", () => {
    expect(ByteRangeHelper.parse("bytes=100-", 100)).toBe(unsatisfiable);
    expect(ByteRangeHelper.parse("bytes=100-200", 100)).toBe(unsatisfiable);
  });

  it("should be unsatisfiable when the end is before the start", () => {
    expect(ByteRangeHelper.parse("bytes=5-2", 100)).toBe(unsatisfiable);
  });

  it("should be unsatisfiable for a zero length suffix", () => {
    expect(ByteRangeHelper.parse("bytes=-0", 100)).toBe(unsatisfiable);
  });

  it("should be unsatisfiable for an empty file", () => {
    expect(ByteRangeHelper.parse("bytes=0-", 0)).toBe(unsatisfiable);
    expect(ByteRangeHelper.parse("bytes=-1", 0)).toBe(unsatisfiable);
  });
});
