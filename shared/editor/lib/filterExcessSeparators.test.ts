import { EmbedDescriptor } from "../embeds";
import filterExcessSeparators from "./filterExcessSeparators";

const embedDescriptor = new EmbedDescriptor({
  title: "Test",
  icon: () => null,
  component: () => null,
});

describe("filterExcessSeparators", () => {
  test("filter hanging end separators", () => {
    expect(
      filterExcessSeparators([
        embedDescriptor,
        { name: "separator" },
        { name: "separator" },
        { name: "separator" },
        { name: "separator" },
      ])
    ).toStrictEqual([embedDescriptor]);
  });

  test("filter hanging start separators", () => {
    expect(
      filterExcessSeparators([
        { name: "separator" },
        { name: "separator" },
        { name: "separator" },
        { name: "separator" },
        embedDescriptor,
      ])
    ).toStrictEqual([embedDescriptor]);
  });

  test("filter surrounding separators", () => {
    expect(
      filterExcessSeparators([
        { name: "separator" },
        embedDescriptor,
        { name: "separator" },
      ])
    ).toStrictEqual([embedDescriptor]);
  });
});
