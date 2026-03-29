import mime from "mime-types";
import truncate from "lodash/truncate";
import type { ProsemirrorData } from "@shared/types";
import { DocumentValidation } from "@shared/validations";
import { serializer } from "@server/editor";
import { traceFunction } from "@server/logging/tracing";
import type { User } from "@server/models";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import type { APIContext } from "@server/types";
import { DocumentConverter } from "@server/utils/DocumentConverter";
import { InvalidRequestError } from "../errors";

type Props = {
  user: User;
  mimeType: string;
  fileName: string;
  content: Buffer | string;
  ctx: APIContext;
};

type ImportResult = {
  icon?: string;
  text: string;
  title: string;
  state: Buffer;
};

/**
 * Converts document content to state and validates size constraints.
 *
 * @param content The document content as Prosemirror JSON.
 * @param title The document title (used in error messages).
 * @returns The Y.Doc state buffer.
 */
function convertToState(content: ProsemirrorData, title: string): Buffer {
  const ydoc = ProsemirrorHelper.toYDoc(content);
  const state = ProsemirrorHelper.toState(ydoc);

  if (state.length > DocumentValidation.maxStateLength) {
    throw InvalidRequestError(
      `The document "${title}" is too large to import, please reduce the length and try again`
    );
  }

  return state;
}

async function documentImporter({
  mimeType,
  fileName,
  content,
  user,
  ctx,
}: Props): Promise<ImportResult> {
  // Find valid extensions and remove them from the title
  const extensions = [
    "docx",
    "md",
    "markdown",
    "html",
    ...(mime.extensions[mimeType] ?? []),
  ];
  const fileTitle = fileName.replace(
    new RegExp(`\\.(${extensions.join("|")})$`, "i"),
    ""
  );

  // Convert document using unified converter
  const {
    doc,
    title: extractedTitle,
    icon,
  } = await DocumentConverter.convert(content, fileName, mimeType);

  // Use extracted title or fall back to filename
  let title = extractedTitle || fileTitle;

  // Replace external images with attachments
  const processedDoc = await ProsemirrorHelper.replaceImagesWithAttachments(
    ctx,
    doc,
    user
  );

  // Serialize final text and handle empty documents
  let text = serializer.serialize(processedDoc).trim();
  // Empty paragraphs serialize to escaped newlines/backslashes, treat as empty
  if (/^[\\\s]*$/.test(text)) {
    text = "";
  }

  // Truncate title and validate size
  title = truncate(title, { length: DocumentValidation.maxTitleLength });
  const state = convertToState(processedDoc.toJSON() as ProsemirrorData, title);

  return { text, state, title, icon };
}

export default traceFunction({
  spanName: "documentImporter",
})(documentImporter);
