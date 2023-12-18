import { inline } from "css-inline";
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
      base_url: env.URL,
      inline_style_tags: true,
      keep_link_tags: false,
      keep_style_tags: false,
      load_remote_stylesheets: false,
    });
  }
}
