import { useEffect, useState } from "react";
import { sanitizeUrl } from "../../../utils/urls";
import type {
  PreviewSheet,
  SheetParser,
} from "../../lib/attachmentPreview/tabular";

interface AttachmentSheets {
  /** The parsed sheets, undefined until loading has finished. */
  sheets: PreviewSheet[] | undefined;
  /** Whether the attachment could not be downloaded or parsed. */
  error: boolean;
}

/**
 * Downloads an attachment and parses it into sheets for a tabular preview.
 * The request is cancelled when the component unmounts or the attachment
 * changes.
 *
 * @param href - the attachment url, undefined to skip loading.
 * @param parse - converts the downloaded attachment into sheets.
 * @returns the parsed sheets and whether loading failed.
 */
export default function useAttachmentSheets(
  href: string | undefined,
  parse: SheetParser
): AttachmentSheets {
  const [state, setState] = useState<AttachmentSheets>({
    sheets: undefined,
    error: false,
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

        const sheets = await parse(response);
        if (!controller.signal.aborted) {
          setState({ sheets, error: false });
        }
      } catch (_err) {
        if (!controller.signal.aborted) {
          setState({ sheets: undefined, error: true });
        }
      }
    }

    void load(url);

    return () => controller.abort();
  }, [href, parse]);

  return state;
}
