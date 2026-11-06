import { ChatMessageHelper } from "./ChatMessageHelper";

describe("ChatMessageHelper", () => {
  it.each([
    ["a *b* [c](d) <e>", "a \\*b\\* \\[c\\]\\(d\\) \\<e\\>"],
    ["Hello “world”", "Hello “world”"],
  ])("escape(%j)", (input, expected) => {
    expect(ChatMessageHelper.escape(input)).toEqual(expected);
  });

  it.each([
    [
      "This title <b>contains</b> a\nsearch term",
      "This title **contains** asearch term",
    ],
    ["a*b <b>c_d</b> [e]", "a\\*b **c\\_d** \\[e\\]"],
  ])("fromSearchContext(%j)", (input, expected) => {
    expect(ChatMessageHelper.fromSearchContext(input)).toEqual(expected);
  });
});
