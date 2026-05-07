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
  ClockIcon,
  CalendarIcon,
  MathIcon,
  DoneIcon,
  EmbedIcon,
  CollapseIcon,
} from "outline-icons";
import * as React from "react";
import styled from "styled-components";
import type { TFunction } from "i18next";
import Image from "@shared/editor/components/Img";
import type { MenuItem } from "@shared/editor/types";
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
        width: 300,
        height: 424,
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
      name: "container_toggle",
      title: t("Toggle block"),
      icon: <CollapseIcon />,
      keywords: "toggle collapsible collapse fold",
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
      name: "date",
      title: t("Current date"),
      keywords: "clock today",
      icon: <CalendarIcon />,
    },
    {
      name: "time",
      title: t("Current time"),
      keywords: "clock now",
      icon: <ClockIcon />,
    },
    {
      name: "datetime",
      title: t("Current date and time"),
      keywords: "clock today date",
      icon: <CalendarIcon />,
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
