import { t } from "i18next";
import { DocumentIcon } from "outline-icons";
import UnsupportedPreview from "../../components/UnsupportedPreview";
import { aspectRatioResolver } from "./dimensions";
import { matchesFileType } from "./match";
import type { AttachmentPreviewProvider } from "./types";

/** The natural size of a word processing document preview, in points at A4. */
const naturalWidth = 768;
const naturalHeight = 1086;

export const docxPreview: AttachmentPreviewProvider = {
  id: "docx",
  accept: ".docx,.doc",
  label: () => t("Show preview"),
  icon: <DocumentIcon />,
  component: UnsupportedPreview,
  match: matchesFileType(
    [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ],
    ["docx", "doc"]
  ),
  resolveDimensions: aspectRatioResolver(naturalWidth, naturalHeight),
};
