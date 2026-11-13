import {
  BlockQuoteIcon,
  BulletedListIcon,
  CodeIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  Heading4Icon,
  HorizontalRuleIcon,
  OrderedListIcon,
  PageBreakIcon,
  PDFIcon,
  TableIcon,
  TodoListIcon,
  ImageIcon,
  AttachmentIcon,
  CalendarIcon,
  MathIcon,
  EmbedIcon,
  CollapseIcon,
} from "outline-icons";
import * as React from "react";
import styled from "styled-components";
import { v4 as uuidv4 } from "uuid";
import type { TFunction } from "i18next";
import Image from "@shared/editor/components/Img";
import { NoticeTypes } from "@shared/editor/nodes/Notice";
import type { MenuItem } from "@shared/editor/types";
import { MentionType } from "@shared/types";
import { toISODate } from "@shared/utils/date";
import { metaDisplay } from "@shared/utils/keyboard";
import { NoticeIcon } from "~/editor/components/NoticeIcon";
import Desktop from "~/utils/Desktop";

const Img = styled(Image)`
  border-radius: 2px;
  background: #fff;
  box-shadow: 0 0 0 1px #fff;
  margin: 4px;
  width: 18px;
  height: 18px;
`;

export default function blockMenuItems(
  t: TFunction,
  documentRef: React.RefObject<HTMLDivElement | null>
): MenuItem[] {
  const documentWidth = documentRef.current?.clientWidth ?? 0;

  const items = [
    {
      name: "heading",
      title: t("Big heading"),
      keywords: "h1 heading1 title header",
      icon: <Heading1Icon />,
      shortcut: "^ ⇧ 1",
      attrs: { level: 1 },
    },
    {
      name: "heading",
      title: t("Medium heading"),
      keywords: "h2 heading2 header subtitle",
      icon: <Heading2Icon />,
      shortcut: "^ ⇧ 2",
      attrs: { level: 2 },
    },
    {
      name: "heading",
      title: t("Small heading"),
      keywords: "h3 heading3 header",
      icon: <Heading3Icon />,
      shortcut: "^ ⇧ 3",
      attrs: { level: 3 },
    },
    {
      name: "heading",
      title: t("Extra small heading"),
      keywords: "h4 heading4 header",
      icon: <Heading4Icon />,
      shortcut: "^ ⇧ 4",
      attrs: { level: 4 },
    },
    {
      name: "separator",
    },
    {
      name: "checkbox_list",
      title: t("Todo list"),
      icon: <TodoListIcon />,
      keywords: "checklist checkbox task",
      shortcut: "^ ⇧ 7",
    },
    {
      name: "bullet_list",
      title: t("Bulleted list"),
      icon: <BulletedListIcon />,
      keywords: "unordered dash point",
      shortcut: "^ ⇧ 8",
    },
    {
      name: "ordered_list",
      title: t("Ordered list"),
      icon: <OrderedListIcon />,
      keywords: "ol numbered",
      shortcut: "^ ⇧ 9",
    },
    {
      name: "separator",
    },
    {
      name: "image",
      title: t("Image"),
      icon: <ImageIcon />,
      keywords: "picture photo img upload png jpg screenshot",
    },
    {
      name: "video",
      title: t("Video"),
      icon: <EmbedIcon />,
      keywords: "movie avi mp4 film upload player",
    },
    {
      name: "attachment",
      title: t("Embed PDF"),
      icon: <PDFIcon />,
      keywords: "document upload attach",
      attrs: {
        accept: "application/pdf",
        preview: true,
      },
    },
    {
      name: "attachment",
      title: t("File attachment"),
      icon: <AttachmentIcon />,
      keywords: "upload attach",
    },
    {
      name: "table",
      title: t("Table"),
      icon: <TableIcon />,
      keywords: "grid spreadsheet rows columns cells",
      attrs: {
        rowsCount: 3,
        colsCount: 3,
        colWidth: documentWidth / 3,
      },
    },
    {
      name: "blockquote",
      title: t("Quote"),
      icon: <BlockQuoteIcon />,
      keywords: "blockquote pullquote citation",
      shortcut: `${metaDisplay} ]`,
    },
    {
      name: "code_block",
      title: t("Code block"),
      icon: <CodeIcon />,
      shortcut: "^ ⇧ c",
      keywords: "script snippet syntax pre",
    },
    {
      name: "math_block",
      title: t("Math block (LaTeX)"),
      icon: <MathIcon />,
      keywords: "katex formula equation",
    },
    {
      name: "hr",
      title: t("Divider"),
      icon: <HorizontalRuleIcon />,
      shortcut: `${metaDisplay} _`,
      keywords: "horizontal rule break line separator",
    },
    {
      name: "hr",
      title: t("Page break"),
      icon: <PageBreakIcon />,
      keywords: "pagebreak print line",
      attrs: { markup: "***" },
    },
    {
      // Inserts a date mention for today. Supersedes the deprecated "Current
      // date/time" commands that inserted a static string or template token.
      name: "mention",
      title: t("Current date"),
      keywords: "clock today time now",
      icon: <CalendarIcon />,
      appendSpace: true,
      attrs: () => {
        const modelId = toISODate(new Date());
        return {
          id: uuidv4(),
          type: MentionType.Date,
          modelId,
          label: modelId,
        };
      },
    },
    {
      name: "separator",
    },
    {
      name: "container_toggle",
      title: t("Toggle block"),
      icon: <CollapseIcon />,
      keywords: "collapsible collapse fold accordion details expand",
    },
    {
      name: "container_toggle",
      title: t("Big toggle heading"),
      icon: <Heading1Icon />,
      keywords: "collapsible collapse fold accordion details expand h1",
      attrs: { level: 1 },
    },
    {
      name: "container_toggle",
      title: t("Medium toggle heading"),
      icon: <Heading2Icon />,
      keywords: "collapsible collapse fold accordion details expand h2",
      attrs: { level: 2 },
    },
    {
      name: "container_toggle",
      title: t("Small toggle heading"),
      icon: <Heading3Icon />,
      keywords: "collapsible collapse fold accordion details expand h3",
      attrs: { level: 3 },
    },
    {
      name: "container_toggle",
      title: t("Extra small toggle heading"),
      icon: <Heading4Icon />,
      keywords: "collapsible collapse fold accordion details expand h4",
      attrs: { level: 4 },
    },
    {
      name: "separator",
    },
    {
      name: "container_notice",
      title: t("Info notice"),
      icon: <NoticeIcon type={NoticeTypes.Info} />,
      keywords: "card callout hint information note",
      attrs: { style: NoticeTypes.Info },
    },
    {
      name: "container_notice",
      title: t("Success notice"),
      icon: <NoticeIcon type={NoticeTypes.Success} />,
      keywords: "card callout hint",
      attrs: { style: NoticeTypes.Success },
    },
    {
      name: "container_notice",
      title: t("Warning notice"),
      icon: <NoticeIcon type={NoticeTypes.Warning} />,
      keywords: "card callout hint error caution danger alert",
      attrs: { style: NoticeTypes.Warning },
    },
    {
      name: "container_notice",
      title: t("Tip notice"),
      icon: <NoticeIcon type={NoticeTypes.Tip} />,
      keywords: "card callout hint suggestion",
      attrs: { style: NoticeTypes.Tip },
    },
    {
      name: "separator",
    },
    {
      name: "code_block",
      title: "Mermaid diagram",
      icon: <Img src="/images/mermaidjs.png" alt="Mermaid diagram" />,
      keywords: "flowchart graph sequence gantt",
      attrs: { language: "mermaid" },
    },
    {
      name: "editDiagram",
      title: "Diagrams.net diagram",
      icon: <Img src="/images/diagrams.png" alt="Diagrams.net diagram" />,
      keywords: "flowchart drawio draw.io whiteboard",
    },
  ];

  // Filter out diagrams.net in desktop app
  return Desktop.isElectron()
    ? items.filter((item) => item.name !== "editDiagram")
    : items;
}
