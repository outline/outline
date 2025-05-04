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
  ToDoBlockObjectResponse,
  EquationBlockObjectResponse,
  CodeBlockObjectResponse,
  ToggleBlockObjectResponse,
  PageObjectResponse,
  VideoBlockObjectResponse,
  CalloutBlockObjectResponse,
  ColumnListBlockObjectResponse,
  ColumnBlockObjectResponse,
  LinkPreviewBlockObjectResponse,
  SyncedBlockBlockObjectResponse,
  LinkToPageBlockObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";
import isArray from "lodash/isArray";
import { NoticeTypes } from "@shared/editor/nodes/Notice";
import { MentionType, ProsemirrorData, ProsemirrorDoc } from "@shared/types";
import Logger from "@server/logging/Logger";
import { Block } from "../../shared/types";

export type NotionPage = PageObjectResponse & {
  children: Block[];
};

/** Convert Notion blocks to Outline data. */
export class NotionConverter {
  /**
   * Nodes which cannot contain block children in Outline, their children
   * will be flattened into the parent.
   */
  private static nodesWithoutBlockChildren = ["paragraph", "toggle"];

  public static page(item: NotionPage): ProsemirrorDoc {
    return {
      type: "doc",
      content: this.mapChildren(item),
    };
  }

  private static mapChildren(item: Block | NotionPage) {
    const mapChild = (
      child: Block
    ): ProsemirrorData | ProsemirrorData[] | undefined => {
      if (child.type === "child_page" || child.type === "child_database") {
        return; // this will be created as a nested page, no need to handle/convert.
      }

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

  private static callout(item: Block<CalloutBlockObjectResponse>) {
    const colorToNoticeType: Record<string, NoticeTypes> = {
      default_background: NoticeTypes.Info,
      blue_background: NoticeTypes.Info,
      purple_background: NoticeTypes.Info,
      green_background: NoticeTypes.Success,
      orange_background: NoticeTypes.Tip,
      yellow_background: NoticeTypes.Tip,
      pink_background: NoticeTypes.Warning,
      red_background: NoticeTypes.Warning,
    };

    return {
      type: "container_notice",
      attrs: {
        style:
          colorToNoticeType[item.callout.color as string] ?? NoticeTypes.Info,
      },
      content: [
        {
          type: "paragraph",
          content: item.callout.rich_text.map(this.rich_text).filter(Boolean),
        },
        ...this.mapChildren(item),
      ],
    };
  }

  private static column_list(item: Block<ColumnListBlockObjectResponse>) {
    return this.mapChildren(item);
  }

  private static column(item: Block<ColumnBlockObjectResponse>) {
    return this.mapChildren(item);
  }

  private static bookmark(item: BookmarkBlockObjectResponse) {
    const caption = item.bookmark.caption
      .map(this.rich_text_to_plaintext)
      .join("");

    return {
      type: "paragraph",
      content: [
        {
          text: caption || item.bookmark.url,
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
    item: Block<BulletedListItemBlockObjectResponse>
  ) {
    return {
      type: "list_item",
      content: [
        {
          type: "paragraph",
          content: item.bulleted_list_item.rich_text
            .map(this.rich_text)
            .filter(Boolean),
        },
        ...this.mapChildren(item),
      ],
    };
  }

  private static code(item: CodeBlockObjectResponse) {
    const text = item.code.rich_text.map(this.rich_text_to_plaintext).join("");

    return {
      type: "code_fence",
      attrs: {
        language: item.code.language,
      },
      content: text ? [{ type: "text", text }] : undefined,
    };
  }

  private static numbered_list_item(
    item: Block<NumberedListItemBlockObjectResponse>
  ) {
    return {
      type: "list_item",
      content: [
        {
          type: "paragraph",
          content: item.numbered_list_item.rich_text
            .map(this.rich_text)
            .filter(Boolean),
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
          text: item.plain_text || item.mention.link_mention.href,
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
          text: item.plain_text || item.mention.link_preview.url,
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

      if (item.plain_text) {
        return {
          type: "text",
          text: item.plain_text,
        };
      }

      return undefined;
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

    if (item.text.content) {
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

    return undefined;
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
      content: item.equation.expression
        ? [
            {
              type: "text",
              text: item.equation.expression,
            },
          ]
        : undefined,
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
        title: item.pdf.caption.map(this.rich_text_to_plaintext).join(""),
      },
    };
  }

  private static heading_1(item: Heading1BlockObjectResponse) {
    return {
      type: "heading",
      attrs: {
        level: 1,
      },
      content: item.heading_1.rich_text.map(this.rich_text).filter(Boolean),
    };
  }

  private static heading_2(item: Heading2BlockObjectResponse) {
    return {
      type: "heading",
      attrs: {
        level: 2,
      },
      content: item.heading_2.rich_text.map(this.rich_text).filter(Boolean),
    };
  }

  private static heading_3(item: Heading3BlockObjectResponse) {
    return {
      type: "heading",
      attrs: {
        level: 3,
      },
      content: item.heading_3.rich_text.map(this.rich_text).filter(Boolean),
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

  private static link_preview(item: LinkPreviewBlockObjectResponse) {
    return {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: item.link_preview.url,
          marks: [
            {
              type: "link",
              attrs: {
                href: item.link_preview.url,
              },
            },
          ],
        },
      ],
    };
  }

  private static link_to_page(item: LinkToPageBlockObjectResponse) {
    if (item.link_to_page.type !== "page_id") {
      return undefined;
    }
    return {
      type: "mention",
      attrs: {
        modelId: item.link_to_page.page_id,
        type: MentionType.Document,
        label: "Page",
      },
    };
  }

  private static paragraph(item: ParagraphBlockObjectResponse) {
    return {
      type: "paragraph",
      content: item.paragraph.rich_text.map(this.rich_text).filter(Boolean),
    };
  }

  private static quote(item: Block<QuoteBlockObjectResponse>) {
    return {
      type: "blockquote",
      content: [
        {
          type: "paragraph",
          content: item.quote.rich_text.map(this.rich_text).filter(Boolean),
        },
        ...this.mapChildren(item),
      ],
    };
  }

  private static synced_block(item: Block<SyncedBlockBlockObjectResponse>) {
    return this.mapChildren(item);
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
              content: td.map(this.rich_text).filter(Boolean),
            },
          ],
        })),
      })),
    };
  }

  private static toggle(item: ToggleBlockObjectResponse) {
    return {
      type: "paragraph",
      content: item.toggle.rich_text.map(this.rich_text).filter(Boolean),
    };
  }

  private static to_do(item: Block<ToDoBlockObjectResponse>) {
    return {
      type: "checkbox_item",
      attrs: {
        checked: item.to_do.checked,
      },
      content: [
        {
          type: "paragraph",
          content: item.to_do.rich_text.map(this.rich_text).filter(Boolean),
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
