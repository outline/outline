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
  StarredIcon,
  WarningIcon,
  InfoIcon,
  AttachmentIcon,
  CalendarIcon,
  MathIcon,
  DoneIcon,
  EmbedIcon,
  CollapseIcon,
} from "outline-icons";
import * as React from "react";
import styled from "styled-components";
import { v4 as uuidv4 } from "uuid";
import type { TFunction } from "i18next";
import Image from "@shared/editor/components/Img";
import type { MenuItem } from "@shared/editor/types";
import { MentionType } from "@shared/types";
import { toISODate } from "@shared/utils/date";
import { metaDisplay } from "@shared/utils/keyboard";
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
  documentRef: React.RefObject<HTMLDivElement>
): MenuItem[] {
  const documentWidth = documentRef.current?.clientWidth ?? 0;

  const items = [
    {
      name: "heading",
      title: t("Big heading"),
      keywords: "h1 heading1 title",
      icon: <Heading1Icon />,
      shortcut: "^ ⇧ 1",
      attrs: { level: 1 },
    },
    {
      name: "heading",
      title: t("Medium heading"),
      keywords: "h2 heading2",
      icon: <Heading2Icon />,
      shortcut: "^ ⇧ 2",
      attrs: { level: 2 },
    },
    {
      name: "heading",
      title: t("Small heading"),
      keywords: "h3 heading3",
      icon: <Heading3Icon />,
      shortcut: "^ ⇧ 3",
      attrs: { level: 3 },
    },
    {
      name: "heading",
      title: t("Extra small heading"),
      keywords: "h4 heading4",
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
      shortcut: "^ ⇧ 8",
    },
    {
      name: "ordered_list",
      title: t("Ordered list"),
      icon: <OrderedListIcon />,
      shortcut: "^ ⇧ 9",
    },
    {
      name: "separator",
    },
    {
      name: "image",
      title: t("Image"),
      icon: <ImageIcon />,
      keywords: "picture photo",
    },
    {
      name: "video",
      title: t("Video"),
      icon: <EmbedIcon />,
      keywords: "mov avi upload player",
    },
    {
      name: "attachment",
      title: t("Embed PDF"),
      icon: <PDFIcon />,
      keywords: "pdf upload attach",
      attrs: {
        accept: "application/pdf",
        preview: true,
      },
    },
    {
      name: "attachment",
      title: t("File attachment"),
      icon: <AttachmentIcon />,
      keywords: "file upload attach",
    },
    {
      name: "table",
      title: t("Table"),
      icon: <TableIcon />,
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
      keywords: "blockquote pullquote",
      shortcut: `${metaDisplay} ]`,
    },
    {
      name: "code_block",
      title: t("Code block"),
      icon: <CodeIcon />,
      shortcut: "^ ⇧ c",
      keywords: "script",
    },
    {
      name: "math_block",
      title: t("Math block (LaTeX)"),
      icon: <MathIcon />,
      keywords: "math katex latex",
    },
    {
      name: "hr",
      title: t("Divider"),
      icon: <HorizontalRuleIcon />,
      shortcut: `${metaDisplay} _`,
      keywords: "horizontal rule break line",
    },
    {
      name: "hr",
      title: t("Page break"),
      icon: <PageBreakIcon />,
      keywords: "page print break line",
      attrs: { markup: "***" },
    },
    {
      // Inserts a date mention for today. Supersedes the deprecated "Current
      // date/time" commands that inserted a static string or template token.
      name: "mention",
      title: t("Current date"),
      keywords: "clock today date time now",
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
      keywords: "toggle collapsible collapse fold",
    },
    {
      name: "container_toggle",
      title: t("Big toggle heading"),
      icon: <Heading1Icon />,
      keywords: "toggle collapsible collapse fold heading h1",
      attrs: { level: 1 },
    },
    {
      name: "container_toggle",
      title: t("Medium toggle heading"),
      icon: <Heading2Icon />,
      keywords: "toggle collapsible collapse fold heading h2",
      attrs: { level: 2 },
    },
    {
      name: "container_toggle",
      title: t("Small toggle heading"),
      icon: <Heading3Icon />,
      keywords: "toggle collapsible collapse fold heading h3",
      attrs: { level: 3 },
    },
    {
      name: "container_toggle",
      title: t("Extra small toggle heading"),
      icon: <Heading4Icon />,
      keywords: "toggle collapsible collapse fold heading h4",
      attrs: { level: 4 },
    },
    {
      name: "separator",
    },
    {
      name: "container_notice",
      title: t("Info notice"),
      icon: <InfoIcon />,
      keywords: "notice card information",
      attrs: { style: "info" },
    },
    {
      name: "container_notice",
      title: t("Success notice"),
      icon: <DoneIcon />,
      keywords: "notice card success",
      attrs: { style: "success" },
    },
    {
      name: "container_notice",
      title: t("Warning notice"),
      icon: <WarningIcon />,
      keywords: "notice card error",
      attrs: { style: "warning" },
    },
    {
      name: "container_notice",
      title: t("Tip notice"),
      icon: <StarredIcon />,
      keywords: "notice card suggestion",
      attrs: { style: "tip" },
    },
    {
      name: "separator",
    },
    {
      name: "code_block",
      title: "Mermaid Diagram",
      icon: <Img src="/images/mermaidjs.png" alt="Mermaid Diagram" />,
      keywords: "diagram flowchart",
      attrs: { language: "mermaid" },
    },
    {
      name: "editDiagram",
      title: "Diagrams.net Diagram",
      icon: <Img src="/images/diagrams.png" alt="Diagrams.net Diagram" />,
      keywords: "diagram flowchart draw.io",
    },
  ];

  // Filter out diagrams.net in desktop app
  return Desktop.isElectron()
    ? items.filter((item) => item.name !== "editDiagram")
    : items;
}
