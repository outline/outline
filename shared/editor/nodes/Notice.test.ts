import { findNodes, parser, serializer } from "../../test/editor";

const findNoticeAttrs = (markdown: string) => {
  const notice = findNodes(
    parser.parse(markdown)?.toJSON(),
    "container_notice"
  )[0];
  if (!notice?.attrs) {
    throw new Error("Expected notice node with attributes");
  }
  return notice.attrs;
};

describe("Notice node", () => {
  it("parses a notice without icon or color", () => {
    expect(findNoticeAttrs(":::info\nHello\n:::")).toEqual({
      style: "info",
      icon: null,
      color: null,
    });
  });

  it("parses an icon and color from the fence", () => {
    expect(
      findNoticeAttrs(":::tip icon=rocket color=#FF5C80\nHello\n:::")
    ).toEqual({
      style: "tip",
      icon: "rocket",
      color: "#FF5C80",
    });
  });

  it("discards a color that is not hex notation", () => {
    expect(
      findNoticeAttrs(":::info color=red;background:url(x)\nHello\n:::").color
    ).toBeNull();
  });

  it("serializes the style alone when the preset is unchanged", () => {
    const markdown = serializer.serialize(parser.parse(":::warning\nHi\n:::"));
    expect(markdown).toContain(":::warning\n");
    expect(markdown).not.toContain("icon=");
  });

  it("round-trips an icon and color", () => {
    const original = ":::info icon=rocket color=#FF5C80\nHi\n:::";
    const markdown = serializer.serialize(parser.parse(original));
    expect(markdown).toContain(":::info icon=rocket color=#FF5C80\n");
    expect(findNoticeAttrs(markdown)).toEqual({
      style: "info",
      icon: "rocket",
      color: "#FF5C80",
    });
  });
});
