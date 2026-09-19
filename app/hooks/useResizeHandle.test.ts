import { rubberBand } from "./useResizeHandle";

describe("rubberBand", () => {
  it("returns the value unchanged when within bounds", () => {
    expect(rubberBand(300, { min: 200, max: 600 })).toBe(300);
    expect(rubberBand(200, { min: 200, max: 600 })).toBe(200);
    expect(rubberBand(600, { min: 200, max: 600 })).toBe(600);
  });

  it("resists movement beyond the maximum", () => {
    const slightly = rubberBand(610, { max: 600 });
    expect(slightly).toBeGreaterThan(600);
    expect(slightly).toBeLessThan(610);
  });

  it("resists movement below the minimum", () => {
    const slightly = rubberBand(190, { min: 200 });
    expect(slightly).toBeLessThan(200);
    expect(slightly).toBeGreaterThan(190);
  });

  it("becomes progressively harder to move further", () => {
    const first = rubberBand(620, { max: 600 }) - 600;
    const second =
      rubberBand(640, { max: 600 }) - rubberBand(620, { max: 600 });
    expect(second).toBeLessThan(first);
  });

  it("never travels further than the limit beyond a bound", () => {
    expect(rubberBand(100000, { max: 600, limit: 100 })).toBeLessThan(700);
    expect(rubberBand(-100000, { min: 200, limit: 100 })).toBeGreaterThan(100);
  });

  it("ignores bounds that are not given", () => {
    expect(rubberBand(1000, { min: 200 })).toBe(1000);
    expect(rubberBand(0, { max: 600 })).toBe(0);
  });
});
