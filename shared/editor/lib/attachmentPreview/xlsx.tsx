import { t } from "i18next";
import { TableIcon } from "outline-icons";
import UnsupportedPreview from "../../components/UnsupportedPreview";
import { aspectRatioResolver } from "./dimensions";
import { matchesFileType } from "./match";
import type { AttachmentPreviewProvider } from "./types";

/** The natural size of a spreadsheet preview, wider than it is tall. */
const naturalWidth = 768;
const naturalHeight = 432;

export const xlsxPreview: AttachmentPreviewProvider = {
  id: "xlsx",
  accept: ".xlsx,.xls",
  label: () => t("Show preview"),
  icon: <TableIcon />,
  component: UnsupportedPreview,
  match: matchesFileType(
    [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ],
    ["xlsx", "xls"]
  ),
  resolveDimensions: aspectRatioResolver(naturalWidth, naturalHeight),
};
