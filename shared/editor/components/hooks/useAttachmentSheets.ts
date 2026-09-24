import { useEffect, useState } from "react";
import { sanitizeUrl } from "../../../utils/urls";
import {
  maxPreviewFileSize,
  type PreviewSheet,
  type SheetParser,
} from "../../lib/attachmentPreview/tabular";

interface AttachmentSheets {
  /** The parsed sheets, undefined until loading has finished. */
  sheets: PreviewSheet[] | undefined;
  /** Whether the attachment could not be downloaded or parsed. */
  error: boolean;
  /** Whether the attachment was larger than the preview size limit. */
  tooLarge: boolean;
}

/**
 * Downloads an attachment and parses it into sheets for a tabular preview.
 * The size limit is enforced on the bytes received, so it also applies to
 * attachments whose stored size is missing or wrong. The request is cancelled
 * when the component unmounts or the attachment changes.
 *
 * @param href - the attachment url, undefined to skip loading.
 * @param parse - converts the downloaded attachment into sheets.
 * @returns the parsed sheets, and whether loading failed or the file was too large.
 */
export default function useAttachmentSheets(
  href: string | undefined,
  parse: SheetParser
): AttachmentSheets {
  const [state, setState] = useState<AttachmentSheets>({
    sheets: undefined,
    error: false,
    tooLarge: false,
  });

  useEffect(() => {
    const url = sanitizeUrl(href);
    if (!url) {
      return;
    }

    const controller = new AbortController();

    async function load(source: string) {
      try {
        const response = await fetch(source, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Failed to fetch attachment: ${response.status}`);
        }

        const data = await readWithLimit(response, maxPreviewFileSize);
        const sheets = await parse(data);
        if (!controller.signal.aborted) {
          setState({ sheets, error: false, tooLarge: false });
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          const tooLarge = err instanceof FileTooLargeError;
          setState({ sheets: undefined, error: !tooLarge, tooLarge });
        }
      }
    }

    void load(url);

    return () => controller.abort();
  }, [href, parse]);

  return state;
}

/** Thrown when a downloaded attachment exceeds the preview size limit. */
class FileTooLargeError extends Error {}

/**
 * Reads a response body, stopping as soon as it grows past a byte limit so an
 * oversized file is never fully downloaded or held in memory.
 *
 * @param response - the response to read.
 * @param limit - the largest number of bytes to accept.
 * @returns the body of the response.
 * @throws FileTooLargeError if the body is larger than the limit.
 */
async function readWithLimit(
  response: Response,
  limit: number
): Promise<ArrayBuffer> {
  // reject early when the server declares the size up front
  const declaredSize = Number(response.headers.get("content-length"));
  if (declaredSize > limit) {
    throw new FileTooLargeError();
  }

  if (!response.body) {
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > limit) {
      throw new FileTooLargeError();
    }
    return buffer;
  }

  // count the bytes as they arrive, since the declared size can be missing
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  let result = await reader.read();
  while (!result.done) {
    received += result.value.byteLength;
    if (received > limit) {
      await reader.cancel();
      throw new FileTooLargeError();
    }
    chunks.push(result.value);
    result = await reader.read();
  }

  const body = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body.buffer;
}
