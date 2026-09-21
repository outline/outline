import { t } from "i18next";
import { TableIcon } from "outline-icons";
import UnsupportedPreview from "../../components/UnsupportedPreview";
import { aspectRatioResolver } from "./dimensions";
import { matchesFileType } from "./match";
import type { AttachmentPreviewProvider } from "./types";

/** The natural size of a tabular preview, wider than it is tall. */
const naturalWidth = 768;
const naturalHeight = 432;

export const csvPreview: AttachmentPreviewProvider = {
  id: "csv",
  accept: ".csv,.tsv",
  label: () => t("Show preview"),
  icon: <TableIcon />,
  component: UnsupportedPreview,
  match: matchesFileType(
    ["text/csv", "text/tab-separated-values"],
    ["csv", "tsv"]
  ),
  resolveDimensions: aspectRatioResolver(naturalWidth, naturalHeight),
};
