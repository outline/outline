import { ChatMessageHelper } from "@server/chat/ChatMessageHelper";
import { SlackMessageHelper } from "./SlackMessageHelper";

describe("SlackMessageHelper", () => {
  it.each([
    ["a **b** c", "a *b* c"],
    [
      "[Link your account](https://a.com/b)",
      "<https://a.com/b|Link your account>",
    ],
    [ChatMessageHelper.escape("a *b* [c](d)"), "a *b* [c](d)"],
    [
      ChatMessageHelper.escape("<!channel> & <https://a.com|b>"),
      "&lt;!channel&gt; &amp; &lt;https://a.com|b&gt;",
    ],
    ["[a>b](https://a.com/x|y z>)", "<https://a.com/x%7Cy%20z%3E|a&gt;b>"],
  ])("toMrkdwn(%j)", (input, expected) => {
    expect(SlackMessageHelper.toMrkdwn(input)).toEqual(expected);
  });

  describe("toPayload", () => {
    it("should include blocks, actions and attachments", () => {
      const payload = SlackMessageHelper.toPayload({
        context: "Answer",
        text: "**Yes**",
        visibility: "ephemeral",
        cards: [
          {
            title: "Doc",
            url: "https://a.com/doc",
            text: "Summary",
            timestamp: new Date(2000),
          },
        ],
        actions: [{ id: "postAnswer", label: "Post", value: "123" }],
      });

      expect(payload.text).toEqual("*Yes*");
      expect(payload.blocks).toHaveLength(3);
      expect(payload.blocks?.[2]).toMatchObject({
        type: "actions",
        elements: [{ action_id: "post_answer_to_channel", value: "123" }],
      });
      expect(payload.attachments?.[0]).toMatchObject({
        title: "Doc",
        title_link: "https://a.com/doc",
        text: "Summary",
        ts: 2,
      });
    });

    it("should omit empty blocks and attachments", () => {
      const payload = SlackMessageHelper.toPayload({
        text: "",
        visibility: "ephemeral",
        cards: [],
      });

      expect(payload.blocks).toBeUndefined();
      expect(payload.attachments).toBeUndefined();
    });
  });

  it.each([
    ["at the limit", "a".repeat(3001), ["a".repeat(3000), "a"]],
    [
      "at a line break",
      `${"a".repeat(2500)}\n${"b".repeat(1000)}`,
      ["a".repeat(2500), "b".repeat(1000)],
    ],
    [
      "before a link",
      `${"a".repeat(2990)}<https://a.com/doc|Document>`,
      ["a".repeat(2990), "<https://a.com/doc|Document>"],
    ],
    [
      "before an entity",
      `${"a".repeat(2997)}&amp;b`,
      ["a".repeat(2997), "&amp;b"],
    ],
  ])("splitMrkdwn should split %s", (_name, input, expected) => {
    expect(SlackMessageHelper.splitMrkdwn(input, 3000)).toEqual(expected);
  });

  it("should keep every section within the Slack limit", () => {
    const payload = SlackMessageHelper.toPayload({
      context: "c".repeat(3500),
      text: "word ".repeat(1500),
      visibility: "ephemeral",
      cards: [],
    });

    const blocks: {
      type: string;
      text?: { text: string };
      elements?: { text: string }[];
    }[] = JSON.parse(JSON.stringify(payload.blocks));
    const texts = blocks.map(
      (block) => block.text?.text ?? block.elements?.[0].text ?? ""
    );

    expect(texts.every((text) => text.length <= 3000)).toBe(true);
    expect(blocks.filter((block) => block.type === "section")).toHaveLength(3);
  });
});
