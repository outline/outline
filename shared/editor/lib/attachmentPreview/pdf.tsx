import { t } from "i18next";
import { PDFIcon } from "outline-icons";
import PdfViewer from "../../components/PDF";
import { pdfNaturalHeight, pdfNaturalWidth } from "../pdf";
import { aspectRatioResolver } from "./dimensions";
import { matchesFileType } from "./match";
import type { AttachmentPreviewProvider } from "./types";

export const pdfPreview: AttachmentPreviewProvider = {
  id: "pdf",
  accept: ".pdf",
  label: () => t("Show preview"),
  icon: <PDFIcon />,
  component: PdfViewer,
  match: matchesFileType(["application/pdf"], ["pdf"]),
  resolveDimensions: aspectRatioResolver(pdfNaturalWidth, pdfNaturalHeight),
};
