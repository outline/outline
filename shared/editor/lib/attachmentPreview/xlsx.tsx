import { t } from "i18next";
import { TableIcon } from "outline-icons";
import { SpreadsheetPreview } from "../../components/SpreadsheetPreview";
import { aspectRatioResolver } from "./dimensions";
import { matchesFileType } from "./match";
import { parseXlsx } from "./tabular";
import type {
  AttachmentPreviewProps,
  AttachmentPreviewProvider,
} from "./types";

/** The natural size of a spreadsheet preview, wider than it is tall. */
const naturalWidth = 768;
const naturalHeight = 432;

// Only the Office Open XML format is supported. Legacy binary .xls files
// cannot be read by exceljs, so they keep the plain attachment widget.
export const xlsxPreview: AttachmentPreviewProvider = {
  id: "xlsx",
  accept: ".xlsx",
  label: () => t("Show preview"),
  icon: <TableIcon />,
  component: XlsxPreview,
  match: matchesFileType(
    ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    ["xlsx"]
  ),
  resolveDimensions: aspectRatioResolver(naturalWidth, naturalHeight),
};

function XlsxPreview(props: AttachmentPreviewProps) {
  return <SpreadsheetPreview {...props} parse={parseXlsx} />;
}
