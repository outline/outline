import { describe, expect, it, vi } from "vitest";
import { getSelectedText } from "./useTextSelection";

describe("getSelectedText", () => {
  it("returns the current browser selection text", () => {
    vi.spyOn(window, "getSelection").mockReturnValue({
      toString: () => "selected words",
    } as Selection);

    expect(getSelectedText()).toBe("selected words");
  });

  it("returns an empty string when there is no selection", () => {
    vi.spyOn(window, "getSelection").mockReturnValue(null);

    expect(getSelectedText()).toBe("");
  });
});
