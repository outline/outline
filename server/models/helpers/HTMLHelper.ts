import { initWasm, inline } from "@css-inline/css-inline-wasm";
import { escapeRegExp } from "es-toolkit/compat";
import fs from "fs-extra";
import env from "@server/env";

let initialized = false;

export default class HTMLHelper {
  /**
   * The maximum size, in bytes, of an image that will be inlined into exported
   * HTML as a base64 data URI. Larger images are kept as external files.
   */
  public static readonly maxInlineImageSize = 100 * 1024;

  /**
   * Inline a small image into exported HTML as a base64 data URI in place of
   * its redirect URL. Images are only inlined when they are small and
   * referenced exactly once — images used multiple times are kept as an
   * external file to avoid duplicating the encoded data throughout the export.
   *
   * @param html The HTML content referencing the image.
   * @param redirectUrl The redirect URL of the image within the HTML.
   * @param contentType The content type of the image, e.g. "image/png".
   * @param buffer The contents of the image.
   * @returns The updated HTML if the image was inlined, otherwise null.
   */
  public static inlineImage(
    html: string,
    redirectUrl: string,
    contentType: string | null | undefined,
    buffer: Buffer
  ): string | null {
    if (
      !HTMLHelper.canInlineImage(html, redirectUrl, contentType, buffer.length)
    ) {
      return null;
    }

    return html.replace(
      new RegExp(escapeRegExp(redirectUrl), "g"),
      `data:${contentType};base64,${buffer.toString("base64")}`
    );
  }

  /**
   * Whether an image meets the criteria for inlining, determined from its
   * size alone so that callers can avoid reading images into memory that
   * would be written to the export as an external file regardless.
   *
   * @param html The HTML content referencing the image.
   * @param redirectUrl The redirect URL of the image within the HTML.
   * @param contentType The content type of the image, e.g. "image/png".
   * @param size The size of the image in bytes.
   * @returns True if the image is a candidate for inlining.
   */
  public static canInlineImage(
    html: string,
    redirectUrl: string,
    contentType: string | null | undefined,
    size: number
  ): boolean {
    if (!contentType?.startsWith("image/")) {
      return false;
    }
    if (size === 0 || size > HTMLHelper.maxInlineImageSize) {
      return false;
    }

    const pattern = new RegExp(escapeRegExp(redirectUrl), "g");
    return (html.match(pattern)?.length ?? 0) === 1;
  }

  /**
   * Move CSS styles from <style> tags to inline styles with default settings.
   *
   * @param html The HTML to inline CSS styles for.
   * @returns The HTML with CSS styles inlined.
   */
  public static async inlineCSS(html: string): Promise<string> {
    if (!initialized) {
      const path = require.resolve("@css-inline/css-inline-wasm/index_bg.wasm");
      await initWasm(fs.readFileSync(path));
      initialized = true;
    }
    return inline(html, {
      baseUrl: env.URL,
      inlineStyleTags: true,
      keepLinkTags: false,
      keepStyleTags: false,
      loadRemoteStylesheets: false,
    });
  }
}
