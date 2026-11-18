import { EmbedDescriptor } from "../embeds";
import filterExcessSeparators from "./filterExcessSeparators";

const embedDescriptor = new EmbedDescriptor({
  id: "test",
  title: "Test",
  component: () => null,
});

describe("filterExcessSeparators", () => {
  it("filter hanging end separators", () => {
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

  it("filter hanging start separators", () => {
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

  it("filter surrounding separators", () => {
    expect(
      filterExcessSeparators([
        { name: "separator" },
        embedDescriptor,
        { name: "separator" },
      ])
    ).toStrictEqual([embedDescriptor]);
  });
});
