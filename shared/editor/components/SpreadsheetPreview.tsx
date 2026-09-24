import { useState } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Flex from "../../components/Flex";
import { s } from "../../styles";
import type { AttachmentPreviewProps } from "../lib/attachmentPreview/types";
import {
  maxPreviewFileSize,
  maxPreviewRows,
  type PreviewSheet,
  type SheetParser,
} from "../lib/attachmentPreview/tabular";
import { EditorStyleHelper } from "../styles/EditorStyleHelper";
import useAttachmentSheets from "./hooks/useAttachmentSheets";
import { Preview, Subtitle, Title } from "./Widget";

interface Props extends AttachmentPreviewProps {
  /** Converts the downloaded attachment into sheets. */
  parse: SheetParser;
}

/** The height of the scrollable table area when none is stored on the node. */
const defaultHeight = 400;

/**
 * Renders a tabular attachment (CSV, Excel) as an inline table preview. Shows
 * the first rows of each sheet, with tabs to switch between sheets when the
 * file has more than one.
 */
export function SpreadsheetPreview(props: Props) {
  const { node, isSelected, parse } = props;
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState(0);

  // skip the download when the stored size is already over the limit, the
  // hook enforces the limit again on the bytes received
  const knownTooLarge = (node.attrs.size ?? 0) > maxPreviewFileSize;
  const loaded = useAttachmentSheets(
    knownTooLarge ? undefined : node.attrs.href,
    parse
  );
  const { sheets, error } = loaded;
  const tooLarge = knownTooLarge || loaded.tooLarge;
  const sheet = sheets?.[Math.min(activeIndex, sheets.length - 1)];

  const renderBody = () => {
    if (tooLarge) {
      return <Message>{t("This file is too large to preview")}</Message>;
    }
    if (error) {
      return <Message>{t("This file could not be previewed")}</Message>;
    }
    if (!sheets) {
      return <Message>{t("Loading preview")}…</Message>;
    }
    if (!sheet || sheet.rows.length === 0) {
      return <Message>{t("This file is empty")}</Message>;
    }
    return (
      <SheetTable
        sheet={sheet}
        label={node.attrs.title}
        height={node.attrs.height ?? defaultHeight}
      />
    );
  };

  return (
    <Wrapper
      contentEditable={false}
      className={isSelected ? "ProseMirror-selectednode" : undefined}
      style={{ width: node.attrs.width ?? "100%" }}
    >
      <Flex gap={6} align="center">
        {props.icon}
        <Preview>
          <Title>{props.title}</Title>
          <Subtitle>{props.context}</Subtitle>
        </Preview>
      </Flex>
      {sheets && sheets.length > 1 && (
        <Tabs role="tablist">
          {sheets.map((item, index) => (
            <Tab
              key={`${item.name}-${index}`}
              type="button"
              role="tab"
              aria-selected={item === sheet}
              $active={item === sheet}
              onClick={() => setActiveIndex(index)}
            >
              {item.name}
            </Tab>
          ))}
        </Tabs>
      )}
      {renderBody()}
      {sheet && sheet.totalRows > maxPreviewRows && (
        <Message>
          {t("Showing {{ shown }} of {{ total }} rows", {
            shown: maxPreviewRows,
            total: sheet.totalRows.toLocaleString(),
          })}
        </Message>
      )}
    </Wrapper>
  );
}

interface SheetTableProps {
  /** The sheet to render. */
  sheet: PreviewSheet;
  /** An accessible label for the scrollable table region. */
  label: string;
  /** The maximum height of the scrollable table region. */
  height: number;
}

function SheetTable({ sheet, label, height }: SheetTableProps) {
  const [header, ...body] = sheet.rows;
  const columnCount = Math.max(...sheet.rows.map((row) => row.length));
  // pad short rows so every row lines up with the header
  const pad = (row: string[]) =>
    Array.from({ length: columnCount }, (_, index) => row[index] ?? "");

  return (
    <Scroll
      role="tabpanel"
      tabIndex={0}
      aria-label={label}
      style={{ maxHeight: height }}
    >
      <Table>
        <thead>
          <tr>
            {pad(header).map((cell, index) => (
              <th key={index} scope="col">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {pad(row).map((cell, index) => (
                <td key={index}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </Table>
    </Scroll>
  );
}

const Wrapper = styled.div`
  position: relative;
  margin-left: auto;
  margin-right: auto;
  max-width: 100%;
  background: ${s("background")};
  box-shadow: 0 0 0 1px ${s("divider")};
  border-radius: ${EditorStyleHelper.blockRadius};
  padding: ${EditorStyleHelper.blockRadius};
  user-select: none;
`;

const Tabs = styled.div`
  display: flex;
  gap: 4px;
  margin-top: 6px;
  overflow-x: auto;
`;

const Tab = styled.button<{ $active: boolean }>`
  flex-shrink: 0;
  border: 0;
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 13px;
  cursor: var(--pointer);
  color: ${(props) => (props.$active ? s("text") : s("textTertiary"))};
  background: ${(props) =>
    props.$active ? s("backgroundTertiary") : "transparent"};

  &:hover {
    background: ${s("backgroundSecondary")};
  }
`;

const Scroll = styled.div`
  overflow: auto;
  margin-top: 6px;
  border-radius: 4px;
  box-shadow: 0 0 0 1px ${s("divider")};
  user-select: text;
`;

// && raises specificity above the editor's global table styles, which would
// otherwise add a top margin and break the sticky header row
const Table = styled.table`
  && {
    border-collapse: separate;
    border-spacing: 0;
    border: 0;
    border-radius: 0;
    width: 100%;
    margin: 0;
    font-size: 13px;
  }

  && th,
  && td {
    padding: 4px 8px;
    max-width: 240px;
    border: 0;
    border-right: 1px solid ${s("divider")};
    border-bottom: 1px solid ${s("divider")};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: start;
    vertical-align: top;
  }

  && th {
    position: sticky;
    top: 0;
    z-index: 1;
    font-weight: 500;
    color: ${s("textSecondary")};
    background: ${s("backgroundSecondary")};
  }
`;

const Message = styled.p`
  margin: 8px 0 0;
  font-size: 13px;
  color: ${s("textTertiary")};
`;
