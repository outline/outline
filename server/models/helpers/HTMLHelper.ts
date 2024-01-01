import { inline } from "@css-inline/css-inline-wasm";
import env from "@server/env";

export default class HTMLHelper {
  /**
   * Move CSS styles from <style> tags to inline styles with default settings.
   *
   * @param html The HTML to inline CSS styles for.
   * @returns The HTML with CSS styles inlined.
   */
  public static inlineCSS(html: string): string {
    return inline(html, {
      baseUrl: env.URL,
      inlineStyleTags: true,
      keepLinkTags: false,
      keepStyleTags: false,
      loadRemoteStylesheets: false,
    });
  }
}
