import { initWasm, inline } from "@css-inline/css-inline-wasm";
import fs from "fs-extra";
import env from "@server/env";

let initialized = false;

export default class HTMLHelper {
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
