import { t } from "i18next";
import { TableIcon } from "outline-icons";
import { SpreadsheetPreview } from "../../components/SpreadsheetPreview";
import { aspectRatioResolver } from "./dimensions";
import { matchesFileType } from "./match";
import { parseCsv } from "./tabular";
import type {
  AttachmentPreviewProps,
  AttachmentPreviewProvider,
} from "./types";

/** The natural size of a tabular preview, wider than it is tall. */
const naturalWidth = 768;
const naturalHeight = 432;

export const csvPreview: AttachmentPreviewProvider = {
  id: "csv",
  accept: ".csv,.tsv",
  label: () => t("Show preview"),
  icon: <TableIcon />,
  component: CsvPreview,
  match: matchesFileType(
    ["text/csv", "text/tab-separated-values"],
    ["csv", "tsv"]
  ),
  resolveDimensions: aspectRatioResolver(naturalWidth, naturalHeight),
};

function CsvPreview(props: AttachmentPreviewProps) {
  return <SpreadsheetPreview {...props} parse={parseCsv} />;
}
