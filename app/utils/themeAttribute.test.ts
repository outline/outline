import { afterEach, describe, expect, it } from "vitest";
import { applyThemeAttribute } from "./themeAttribute";
describe("the theme marker on the page", () => {
  afterEach(() => {
    document.documentElement.removeAttribute("data-theme");
  });
  it("marks the page when the dark theme is in use", () => {
    applyThemeAttribute("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });
  it("marks the page when the light theme is in use", () => {
    applyThemeAttribute("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });
  it("changes the mark when the theme is switched", () => {
    applyThemeAttribute("dark");
    applyThemeAttribute("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });
});
