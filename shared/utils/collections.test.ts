import { adjustIndexForMove } from "./collections";

describe("adjustIndexForMove", () => {
  it("compensates for the vacated slot when moving down amongst the same siblings", () => {
    expect(adjustIndexForMove(3, 0, true)).toBe(2);
    expect(adjustIndexForMove(4, 2, true)).toBe(3);
  });

  it("leaves the index alone when moving up amongst the same siblings", () => {
    expect(adjustIndexForMove(0, 2, true)).toBe(0);
    expect(adjustIndexForMove(2, 2, true)).toBe(2);
  });

  it("leaves the index alone when moving to a different parent", () => {
    expect(adjustIndexForMove(3, 0, false)).toBe(3);
  });
});
