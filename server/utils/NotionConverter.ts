import type {
  BookmarkBlockObjectResponse,
  BreadcrumbBlockObjectResponse,
  BulletedListItemBlockObjectResponse,
  DividerBlockObjectResponse,
  Heading1BlockObjectResponse,
  Heading2BlockObjectResponse,
  Heading3BlockObjectResponse,
  NumberedListItemBlockObjectResponse,
  ParagraphBlockObjectResponse,
  QuoteBlockObjectResponse,
  RichTextItemResponse,
  FileBlockObjectResponse,
  PdfBlockObjectResponse,
  ImageBlockObjectResponse,
  EmbedBlockObjectResponse,
  TableBlockObjectResponse,
  BlockObjectResponse,
  ToDoBlockObjectResponse,
  EquationBlockObjectResponse,
  CodeBlockObjectResponse,
  ToggleBlockObjectResponse,
  PageObjectResponse,
  VideoBlockObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";
import isArray from "lodash/isArray";
import { MentionType, ProsemirrorData } from "@shared/types";
import Logger from "@server/logging/Logger";

export type NotionBlock<T = BlockObjectResponse> = T & {
  children: NotionBlock[];
};

export type NotionPage = PageObjectResponse & {
  children: NotionBlock[];
};

/** Convert Notion blocks to Outline data. */
export class NotionConverter {
  // TODO: Implement the following blocks:
  // - "callout"
  // - "child_database"
  // - "child_page"
  // - "column"
  // - "column_list"
  // - "link_preview"
  // - "link_to_page"
  // - "synced_block"

  /**
   * Nodes which cannot contain block children in Outline, their children
   * will be flattened into the parent.
   */
  private static nodesWithoutBlockChildren = [
    // TODO.
    "paragraph",
    "toggle",
  ];

  public static page(item: NotionPage) {
    return {
      type: "doc",
      content: this.mapChildren(item),
    };
  }

  private static mapChildren(item: NotionBlock | NotionPage) {
    const mapChild = (
      child: NotionBlock
    ): ProsemirrorData | ProsemirrorData[] | undefined => {
      // @ts-expect-error Not all blocks have an interface
      if (this[child.type]) {
        // @ts-expect-error Not all blocks have an interface
        const response = this[child.type](child);
        if (
          response &&
          this.nodesWithoutBlockChildren.includes(response.type) &&
          "children" in child
        ) {
          return [response, ...this.mapChildren(child)];
        }
        return response;
      }

      Logger.warn("Encountered unknown Notion block", child);
      return undefined;
    };

    let wrappingList;
    const children = [] as ProsemirrorData[];

    if (!item.children) {
      return [];
    }

    for (const child of item.children) {
      const mapped = mapChild(child);
      if (!mapped) {
        continue;
      }

      // Ensure lists are wrapped correctly – we require a wrapping element
      // whereas Notion does not
      // TODO: Handle mixed list
      if (child.type === "numbered_list_item") {
        if (!wrappingList) {
          wrappingList = {
            type: "ordered_list",
            content: [] as ProsemirrorData[],
          };
        }

        wrappingList.content.push(...(isArray(mapped) ? mapped : [mapped]));
        continue;
      }
      if (child.type === "bulleted_list_item") {
        if (!wrappingList) {
          wrappingList = {
            type: "bullet_list",
            content: [] as ProsemirrorData[],
          };
        }

        wrappingList.content.push(...(isArray(mapped) ? mapped : [mapped]));
        continue;
      }
      if (child.type === "to_do") {
        if (!wrappingList) {
          wrappingList = {
            type: "checkbox_list",
            content: [] as ProsemirrorData[],
          };
        }

        wrappingList.content.push(...(isArray(mapped) ? mapped : [mapped]));
        continue;
      }
      if (wrappingList) {
        children.push(wrappingList);
        wrappingList = undefined;
      }
      children.push(...(isArray(mapped) ? mapped : [mapped]));
    }

    if (wrappingList) {
      children.push(wrappingList);
    }

    return children;
  }

  private static bookmark(item: BookmarkBlockObjectResponse) {
    return {
      type: "paragraph",
      content: [
        {
          text: item.bookmark.caption.map(this.rich_text_to_plaintext).join(""),
          type: "text",
          marks: [
            {
              type: "link",
              attrs: {
                href: item.bookmark.url,
                title: null,
              },
            },
          ],
        },
      ],
    };
  }

  private static breadcrumb(_: BreadcrumbBlockObjectResponse) {
    return undefined;
  }

  private static bulleted_list_item(
    item: NotionBlock<BulletedListItemBlockObjectResponse>
  ) {
    return {
      type: "list_item",
      content: [
        {
          type: "paragraph",
          content: item.bulleted_list_item.rich_text.map(this.rich_text),
        },
        ...this.mapChildren(item),
      ],
    };
  }

  private static code(item: CodeBlockObjectResponse) {
    return {
      type: "code_fence",
      attrs: {
        language: item.code.language,
      },
      content: [
        {
          type: "text",
          text: item.code.rich_text.map(this.rich_text_to_plaintext).join(""),
        },
      ],
    };
  }

  private static numbered_list_item(
    item: NotionBlock<NumberedListItemBlockObjectResponse>
  ) {
    return {
      type: "list_item",
      content: [
        {
          type: "paragraph",
          content: item.numbered_list_item.rich_text.map(this.rich_text),
        },
        ...this.mapChildren(item),
      ],
    };
  }

  private static rich_text(item: RichTextItemResponse) {
    const annotationToMark: Record<
      keyof RichTextItemResponse["annotations"],
      string
    > = {
      bold: "strong",
      code: "code_inline",
      italic: "em",
      underline: "underline",
      strikethrough: "strikethrough",
      color: "highlight",
    };

    const mapAttrs = () =>
      Object.entries(item.annotations)
        .filter(([key]) => key !== "color")
        .filter(([, enabled]) => enabled)
        .map(([key]) => ({
          type: annotationToMark[key as keyof typeof annotationToMark],
        }));

    if (item.type === "mention") {
      if (item.mention.type === "page") {
        return {
          type: "mention",
          attrs: {
            type: MentionType.Document,
            label: item.plain_text,
            modelId: item.mention.page.id,
          },
        };
      }
      if (item.mention.type === "link_mention") {
        return {
          type: "text",
          text: item.plain_text,
          marks: [
            {
              type: "link",
              attrs: {
                href: item.mention.link_mention.href,
              },
            },
          ],
        };
      }
      if (item.mention.type === "link_preview") {
        return {
          type: "text",
          text: item.plain_text,
          marks: [
            {
              type: "link",
              attrs: {
                href: item.mention.link_preview.url,
              },
            },
          ],
        };
      }

      return {
        type: "text",
        text: item.plain_text,
      };
    }

    if (item.type === "equation") {
      return {
        type: "math_inline",
        content: [
          {
            type: "text",
            text: item.equation.expression,
          },
        ],
      };
    }

    return {
      type: "text",
      text: item.text.content,
      marks: [
        ...mapAttrs(),
        ...(item.text.link
          ? [{ type: "link", attrs: { href: item.text.link.url } }]
          : []),
      ].filter(Boolean),
    };
  }

  private static rich_text_to_plaintext(item: RichTextItemResponse) {
    return item.plain_text;
  }

  private static divider(_: DividerBlockObjectResponse) {
    return {
      type: "hr",
    };
  }

  private static equation(item: EquationBlockObjectResponse) {
    return {
      type: "math_block",
      content: [
        {
          type: "text",
          text: item.equation.expression,
        },
      ],
    };
  }

  private static embed(item: EmbedBlockObjectResponse) {
    return {
      type: "embed",
      attrs: {
        href: item.embed.url,
      },
    };
  }

  private static file(item: FileBlockObjectResponse) {
    return {
      type: "attachment",
      attrs: {
        href: "file" in item.file ? item.file.file.url : item.file.external.url,
        title: item.file.name,
      },
    };
  }

  private static pdf(item: PdfBlockObjectResponse) {
    return {
      type: "attachment",
      attrs: {
        href: "file" in item.pdf ? item.pdf.file.url : item.pdf.external.url,
        title: item.pdf.caption.map(this.rich_text_to_plaintext),
      },
    };
  }

  private static heading_1(item: Heading1BlockObjectResponse) {
    return {
      type: "heading",
      attrs: {
        level: 1,
      },
      content: item.heading_1.rich_text.map(this.rich_text),
    };
  }

  private static heading_2(item: Heading2BlockObjectResponse) {
    return {
      type: "heading",
      attrs: {
        level: 2,
      },
      content: item.heading_2.rich_text.map(this.rich_text),
    };
  }

  private static heading_3(item: Heading3BlockObjectResponse) {
    return {
      type: "heading",
      attrs: {
        level: 3,
      },
      content: item.heading_3.rich_text.map(this.rich_text),
    };
  }

  private static image(item: ImageBlockObjectResponse) {
    return {
      type: "paragraph",
      content: [
        {
          type: "image",
          attrs: {
            src:
              "file" in item.image
                ? item.image.file.url
                : item.image.external.url,
            alt: item.image.caption.map(this.rich_text_to_plaintext).join(""),
          },
        },
      ],
    };
  }

  private static paragraph(item: ParagraphBlockObjectResponse) {
    return {
      type: "paragraph",
      content: item.paragraph.rich_text.map(this.rich_text),
    };
  }

  private static quote(item: NotionBlock<QuoteBlockObjectResponse>) {
    return {
      type: "blockquote",
      content: [
        {
          type: "paragraph",
          content: item.quote.rich_text.map(this.rich_text),
        },
        ...this.mapChildren(item),
      ],
    };
  }

  private static table(
    item: TableBlockObjectResponse & {
      children: Array<{
        table_row: {
          cells: Array<Array<RichTextItemResponse>>;
        };
        type?: "table_row";
        object?: "block";
      }>;
    }
  ) {
    return {
      type: "table",
      content: item.children.map((tr, y) => ({
        type: "tr",
        content: tr.table_row.cells.map((td, x) => ({
          type:
            (item.table.has_row_header && y === 0) ||
            (item.table.has_column_header && x === 0)
              ? "th"
              : "td",
          content: [
            {
              type: "paragraph",
              content: td.map(this.rich_text),
            },
          ],
        })),
      })),
    };
  }

  private static toggle(item: ToggleBlockObjectResponse) {
    return {
      type: "paragraph",
      content: item.toggle.rich_text.map(this.rich_text),
    };
  }

  private static to_do(item: NotionBlock<ToDoBlockObjectResponse>) {
    return {
      type: "checkbox_item",
      attrs: {
        checked: item.to_do.checked,
      },
      content: [
        {
          type: "paragraph",
          content: item.to_do.rich_text.map(this.rich_text),
        },
        ...this.mapChildren(item),
      ],
    };
  }

  private static video(item: VideoBlockObjectResponse) {
    if (item.video.type === "file") {
      return {
        type: "video",
        attrs: {
          src: item.video.file.url,
          title: item.video.caption.map(this.rich_text_to_plaintext).join(""),
        },
      };
    }

    return {
      type: "embed",
      attrs: {
        href: item.video.external.url,
      },
    };
  }
}
