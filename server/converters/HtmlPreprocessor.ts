/**
 * Cleans up an HTML DOM before it is parsed into a Prosemirror document,
 * handling the quirks of the tools that produce imported HTML.
 */
export class HtmlPreprocessor {
  /**
   * Preprocesses HTML DOM before Prosemirror parsing to cleanup
   * images and other elements.
   *
   * @param document The DOM document to preprocess.
   */
  public static preprocess(document: Document): void {
    // Handle images: filter emoticons, remove Jira icons, apply Confluence sizing
    const images = document.querySelectorAll("img");
    images.forEach((img) => {
      const className = img.className || "";

      // Skip emoticon images (they'll be dropped)
      if (className.includes("emoticon")) {
        img.remove();
        return;
      }

      // Remove Jira icon images
      if (
        className === "icon" &&
        img.parentElement?.className.includes("jira-issue-key")
      ) {
        img.remove();
        return;
      }

      // Handle Confluence image sizing: data-width/data-height → width/height
      const dataWidth = img.getAttribute("data-width");
      const dataHeight = img.getAttribute("data-height");
      const width = img.getAttribute("width");

      if (dataWidth && dataHeight && width) {
        const ratio = parseInt(dataWidth) / parseInt(width);
        const calculatedHeight = Math.round(parseInt(dataHeight) / ratio);
        img.setAttribute("height", String(calculatedHeight));
      }

      // Extract dimensions from data URI images that lack width/height
      // (e.g. images embedded by mammoth during docx import).
      // Only decode a small prefix of the base64 data — headers for all
      // supported formats live within the first 64 KB of the file.
      if (!img.getAttribute("width") && !img.getAttribute("height")) {
        const src = img.getAttribute("src") || "";
        if (src.startsWith("data:") && src.includes(";base64,")) {
          const base64Start = src.indexOf(";base64,") + 8;
          // 4 base64 chars → 3 bytes; decode at most ~64 KB of image data.
          const maxBase64Chars = Math.ceil(65536 / 3) * 4;
          const base64Prefix = src.slice(
            base64Start,
            base64Start + maxBase64Chars
          );
          const dimensions = this.getImageDimensions(
            Buffer.from(base64Prefix, "base64")
          );
          if (dimensions) {
            img.setAttribute("width", String(dimensions.width));
            img.setAttribute("height", String(dimensions.height));
          }
        }
      }
    });
  }
  /**
   * Parse image dimensions from a binary buffer. Supports PNG, JPEG, and GIF.
   *
   * @param buffer The image data.
   * @returns The width and height if parseable, otherwise undefined.
   */
  private static getImageDimensions(
    buffer: Buffer
  ): { width: number; height: number } | undefined {
    try {
      // PNG: signature + IHDR chunk
      if (
        buffer.length >= 24 &&
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47
      ) {
        return {
          width: buffer.readUInt32BE(16),
          height: buffer.readUInt32BE(20),
        };
      }

      // GIF: signature + logical screen descriptor
      if (
        buffer.length >= 10 &&
        buffer[0] === 0x47 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46
      ) {
        return {
          width: buffer.readUInt16LE(6),
          height: buffer.readUInt16LE(8),
        };
      }

      // JPEG: scan for SOF marker (cap at 64 KB to bound work)
      if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xd8) {
        const scanLimit = Math.min(buffer.length, 65536);
        let offset = 2;
        while (offset + 1 < scanLimit) {
          if (buffer[offset] !== 0xff) {
            offset++;
            continue;
          }
          const marker = buffer[offset + 1];
          offset += 2;

          // Standalone markers without a payload
          if (
            marker === 0x00 ||
            marker === 0x01 ||
            (marker >= 0xd0 && marker <= 0xd9)
          ) {
            continue;
          }

          if (offset + 2 > scanLimit) {
            break;
          }
          const segmentLength = buffer.readUInt16BE(offset);

          // SOF markers contain the frame dimensions — check before
          // the advance guard since this returns immediately.
          if (
            (marker >= 0xc0 && marker <= 0xc3) ||
            (marker >= 0xc5 && marker <= 0xc7) ||
            (marker >= 0xc9 && marker <= 0xcb) ||
            (marker >= 0xcd && marker <= 0xcf)
          ) {
            if (offset + 7 <= buffer.length) {
              return {
                height: buffer.readUInt16BE(offset + 3),
                width: buffer.readUInt16BE(offset + 5),
              };
            }
            break;
          }

          // Length includes itself and must be >= 2; bail on malformed data.
          if (segmentLength < 2 || offset + segmentLength > buffer.length) {
            break;
          }

          offset += segmentLength;
        }
      }
    } catch {
      // Return undefined if parsing fails
    }
    return undefined;
  }
}
