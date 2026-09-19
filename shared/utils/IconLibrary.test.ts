import { IconLibrary } from "./IconLibrary";
import { iconNames } from "./IconNames";

describe("IconNames", () => {
  it("stays in sync with IconLibrary.mapping", () => {
    expect(Object.keys(IconLibrary.mapping)).toEqual([...iconNames]);
  });
});
