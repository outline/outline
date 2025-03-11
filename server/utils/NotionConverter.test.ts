import { NotionConverter } from "./NotionConverter";

describe("NotionConverter", () => {
  it("converts a page", () => {
    const response = NotionConverter.page({
      children: [
        {
          type: "paragraph",
          paragraph: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: "Hello World",
                  link: null,
                },
                annotations: {
                  bold: false,
                  italic: false,
                  strikethrough: false,
                  underline: false,
                  code: false,
                  color: "default",
                },
                plain_text: "Hello World",
                href: null,
              },
            ],
            color: "default",
          },
        },
      ],
    });

    expect(response).toEqual({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              marks: [],
              text: "Hello World",
              type: "text",
            },
          ],
        },
      ],
    });
  });
});
