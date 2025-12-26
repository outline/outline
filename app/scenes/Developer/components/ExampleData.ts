import { type ProsemirrorData } from "@shared/types";

export interface Example {
  id: string;
  name: string;
  before: ProsemirrorData;
  after: ProsemirrorData;
}

/**
 * A collection of example ProseMirror documents to demonstrate diffing capabilities.
 * These examples cover various node types and complexity levels supported by the Outline editor.
 * Node and mark names are matched against those defined in the shared editor schema.
 */
export const examples: Example[] = [
  {
    id: "simple-text",
    name: "Simple Text Change",
    before: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "The quick brown fox jumps over the lazy dog.",
            },
          ],
        },
      ],
    },
    after: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "The fast brown fox leaps over the sleeping dog.",
            },
          ],
        },
      ],
    },
  },
  {
    id: "paragraph-addition",
    name: "Paragraph Addition",
    before: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "This is the first paragraph.",
            },
          ],
        },
      ],
    },
    after: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "This is the first paragraph.",
            },
          ],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "This is a newly added second paragraph.",
            },
          ],
        },
      ],
    },
  },
  {
    id: "formatting-change",
    name: "Formatting Changes",
    before: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "This text is normal.",
            },
          ],
        },
      ],
    },
    after: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              marks: [{ type: "strong" }],
              text: "This text is bold.",
            },
            {
              type: "text",
              text: " And this is ",
            },
            {
              type: "text",
              marks: [{ type: "em" }],
              text: "italic",
            },
            {
              type: "text",
              text: ". ",
            },
            {
              type: "text",
              marks: [{ type: "strikethrough" }],
              text: "Deleted content",
            },
            {
              type: "text",
              text: " and ",
            },
            {
              type: "text",
              marks: [{ type: "code_inline" }],
              text: "inline code",
            },
            {
              type: "text",
              text: ".",
            },
          ],
        },
      ],
    },
  },
  {
    id: "list-changes",
    name: "Bullet List Changes",
    before: {
      type: "doc",
      content: [
        {
          type: "bullet_list",
          content: [
            {
              type: "list_item",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Item one" }],
                },
              ],
            },
            {
              type: "list_item",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Item two" }],
                },
              ],
            },
          ],
        },
      ],
    },
    after: {
      type: "doc",
      content: [
        {
          type: "bullet_list",
          content: [
            {
              type: "list_item",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Item one (modified)" }],
                },
              ],
            },
            {
              type: "list_item",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Item three (added)" }],
                },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: "ordered-list",
    name: "Ordered List",
    before: {
      type: "doc",
      content: [
        {
          type: "ordered_list",
          attrs: { order: 1 },
          content: [
            {
              type: "list_item",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "First" }],
                },
              ],
            },
          ],
        },
      ],
    },
    after: {
      type: "doc",
      content: [
        {
          type: "ordered_list",
          attrs: { order: 1 },
          content: [
            {
              type: "list_item",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "First" }],
                },
              ],
            },
            {
              type: "list_item",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Second" }],
                },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: "checkboxes",
    name: "Checkboxes",
    before: {
      type: "doc",
      content: [
        {
          type: "checkbox_list",
          content: [
            {
              type: "checkbox_item",
              attrs: { checked: false },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Todo item" }],
                },
              ],
            },
          ],
        },
      ],
    },
    after: {
      type: "doc",
      content: [
        {
          type: "checkbox_list",
          content: [
            {
              type: "checkbox_item",
              attrs: { checked: true },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Completed item" }],
                },
              ],
            },
            {
              type: "checkbox_item",
              attrs: { checked: false },
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "New todo" }],
                },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: "code-block",
    name: "Code Block",
    before: {
      type: "doc",
      content: [
        {
          type: "code_block",
          attrs: { language: "javascript" },
          content: [{ type: "text", text: "const x = 1;\nconsole.log(x);" }],
        },
      ],
    },
    after: {
      type: "doc",
      content: [
        {
          type: "code_block",
          attrs: { language: "typescript" },
          content: [
            {
              type: "text",
              text: "const x: number = 1;\nconst y: number = 2;\nconsole.log(x + y);",
            },
          ],
        },
      ],
    },
  },
  {
    id: "table-changes",
    name: "Table Changes",
    before: {
      type: "doc",
      content: [
        {
          type: "table",
          content: [
            {
              type: "tr",
              content: [
                {
                  type: "th",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Name" }],
                    },
                  ],
                },
                {
                  type: "th",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Role" }],
                    },
                  ],
                },
              ],
            },
            {
              type: "tr",
              content: [
                {
                  type: "td",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Tom" }],
                    },
                  ],
                },
                {
                  type: "td",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Engineer" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    after: {
      type: "doc",
      content: [
        {
          type: "table",
          content: [
            {
              type: "tr",
              content: [
                {
                  type: "th",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Full Name" }],
                    },
                  ],
                },
                {
                  type: "th",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Job Role" }],
                    },
                  ],
                },
              ],
            },
            {
              type: "tr",
              content: [
                {
                  type: "td",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Tom Moor" }],
                    },
                  ],
                },
                {
                  type: "td",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Software Engineer" }],
                    },
                  ],
                },
              ],
            },
            {
              type: "tr",
              content: [
                {
                  type: "td",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Jeroen" }],
                    },
                  ],
                },
                {
                  type: "td",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Product" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: "table-add-row",
    name: "Table: Add Row",
    before: {
      type: "doc",
      content: [
        {
          type: "table",
          content: [
            {
              type: "tr",
              content: [
                {
                  type: "th",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Header 1" }],
                    },
                  ],
                },
                {
                  type: "th",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Header 2" }],
                    },
                  ],
                },
              ],
            },
            {
              type: "tr",
              content: [
                {
                  type: "td",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Cell 1" }],
                    },
                  ],
                },
                {
                  type: "td",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Cell 2" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    after: {
      type: "doc",
      content: [
        {
          type: "table",
          content: [
            {
              type: "tr",
              content: [
                {
                  type: "th",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Header 1" }],
                    },
                  ],
                },
                {
                  type: "th",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Header 2" }],
                    },
                  ],
                },
              ],
            },
            {
              type: "tr",
              content: [
                {
                  type: "td",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Cell 1" }],
                    },
                  ],
                },
                {
                  type: "td",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Cell 2" }],
                    },
                  ],
                },
              ],
            },
            {
              type: "tr",
              content: [
                {
                  type: "td",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "New Cell 1" }],
                    },
                  ],
                },
                {
                  type: "td",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "New Cell 2" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: "table-add-column",
    name: "Table: Add Column",
    before: {
      type: "doc",
      content: [
        {
          type: "table",
          content: [
            {
              type: "tr",
              content: [
                {
                  type: "th",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Header 1" }],
                    },
                  ],
                },
                {
                  type: "th",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Header 2" }],
                    },
                  ],
                },
              ],
            },
            {
              type: "tr",
              content: [
                {
                  type: "td",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Cell 1" }],
                    },
                  ],
                },
                {
                  type: "td",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Cell 2" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    after: {
      type: "doc",
      content: [
        {
          type: "table",
          content: [
            {
              type: "tr",
              content: [
                {
                  type: "th",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Header 1" }],
                    },
                  ],
                },
                {
                  type: "th",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Header 2" }],
                    },
                  ],
                },
                {
                  type: "th",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Header 3" }],
                    },
                  ],
                },
              ],
            },
            {
              type: "tr",
              content: [
                {
                  type: "td",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Cell 1" }],
                    },
                  ],
                },
                {
                  type: "td",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Cell 2" }],
                    },
                  ],
                },
                {
                  type: "td",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Cell 3" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: "table-remove-row",
    name: "Table: Remove Row",
    before: {
      type: "doc",
      content: [
        {
          type: "table",
          content: [
            {
              type: "tr",
              content: [
                {
                  type: "th",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Header 1" }],
                    },
                  ],
                },
                {
                  type: "th",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Header 2" }],
                    },
                  ],
                },
              ],
            },
            {
              type: "tr",
              content: [
                {
                  type: "td",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Cell 1" }],
                    },
                  ],
                },
                {
                  type: "td",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Cell 2" }],
                    },
                  ],
                },
              ],
            },
            {
              type: "tr",
              content: [
                {
                  type: "td",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Cell 3" }],
                    },
                  ],
                },
                {
                  type: "td",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Cell 4" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    after: {
      type: "doc",
      content: [
        {
          type: "table",
          content: [
            {
              type: "tr",
              content: [
                {
                  type: "th",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Header 1" }],
                    },
                  ],
                },
                {
                  type: "th",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Header 2" }],
                    },
                  ],
                },
              ],
            },
            {
              type: "tr",
              content: [
                {
                  type: "td",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Cell 1" }],
                    },
                  ],
                },
                {
                  type: "td",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Cell 2" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: "table-remove-column",
    name: "Table: Remove Column",
    before: {
      type: "doc",
      content: [
        {
          type: "table",
          content: [
            {
              type: "tr",
              content: [
                {
                  type: "th",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Header 1" }],
                    },
                  ],
                },
                {
                  type: "th",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Header 2" }],
                    },
                  ],
                },
                {
                  type: "th",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Header 3" }],
                    },
                  ],
                },
              ],
            },
            {
              type: "tr",
              content: [
                {
                  type: "td",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Cell 1" }],
                    },
                  ],
                },
                {
                  type: "td",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Cell 2" }],
                    },
                  ],
                },
                {
                  type: "td",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Cell 3" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    after: {
      type: "doc",
      content: [
        {
          type: "table",
          content: [
            {
              type: "tr",
              content: [
                {
                  type: "th",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Header 1" }],
                    },
                  ],
                },
                {
                  type: "th",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Header 2" }],
                    },
                  ],
                },
              ],
            },
            {
              type: "tr",
              content: [
                {
                  type: "td",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Cell 1" }],
                    },
                  ],
                },
                {
                  type: "td",
                  content: [
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "Cell 2" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    id: "embed-addition",
    name: "Embed Addition",
    before: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "This is the first paragraph." }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "This is the second paragraph." }],
        },
      ],
    },
    after: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "This is the first paragraph." }],
        },
        {
          type: "embed",
          attrs: {
            href: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            align: null,
            width: null,
            height: null,
            ...{
              html: '\u003ciframe width="560" height="315" src="https://www.youtube.com/embed/dQw4w9WgXcQ?si=7T4540C6R3_nE18L" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen\u003e\u003c/iframe\u003e',
              url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
              provider: "YouTube",
              title:
                "Rick Astley - Never Gonna Give You Up (Official Music Video)",
              description:
                "\u201cNever Gonna Give You Up\u201d was a global smash hit for Rick Astley in 1987, taken from his debut album \u201cWhenever You Need Somebody\u201d. It was a #1 in ...",
            },
          },
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "This is the second paragraph." }],
        },
      ],
    },
  },
  {
    id: "notices",
    name: "Notice Nodes",
    before: {
      type: "doc",
      content: [
        {
          type: "container_notice",
          attrs: { style: "info" },
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "This is an important piece of information.",
                },
              ],
            },
          ],
        },
      ],
    },
    after: {
      type: "doc",
      content: [
        {
          type: "container_notice",
          attrs: { style: "warning" },
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "This is a critical warning!" }],
            },
          ],
        },
      ],
    },
  },
  {
    id: "blockquote",
    name: "Blockquote",
    before: {
      type: "doc",
      content: [
        {
          type: "blockquote",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Old quote text" }],
            },
          ],
        },
      ],
    },
    after: {
      type: "doc",
      content: [
        {
          type: "blockquote",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "New quote text" }],
            },
          ],
        },
      ],
    },
  },
  {
    id: "horizontal-rule",
    name: "Horizontal Rule",
    before: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Text above" }],
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Text below" }],
        },
      ],
    },
    after: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Text above" }],
        },
        {
          type: "hr",
          attrs: { markup: "---" },
        },
        {
          type: "paragraph",
          content: [{ type: "text", text: "Text below" }],
        },
      ],
    },
  },
  {
    id: "mentions-links",
    name: "Mentions & Links",
    before: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Check out this document for more info." },
          ],
        },
      ],
    },
    after: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Hey ",
            },
            {
              type: "mention",
              attrs: {
                id: "user-1",
                label: "Tom",
                modelId: "user-1",
                type: "user",
              },
            },
            {
              type: "text",
              text: ", check out ",
            },
            {
              type: "text",
              marks: [
                {
                  type: "link",
                  attrs: { href: "https://www.getoutline.com" },
                },
              ],
              text: "this document",
            },
            {
              type: "text",
              text: " for more info.",
            },
          ],
        },
      ],
    },
  },
];
