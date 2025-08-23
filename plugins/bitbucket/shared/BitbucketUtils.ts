import { integrationSettingsPath } from "@shared/utils/routeHelpers";

// Add client-side environment access
const clientEnv = typeof window === "undefined" ? process.env : window.env;

export class BitbucketUtils {
  public static username = clientEnv.BITBUCKET_USERNAME;

  static get url() {
    return integrationSettingsPath("bitbucket");
  }

  public static getColorForStatus(status: string, isDraftPR: boolean = false) {
    switch (status) {
      case "open":
        return isDraftPR ? "#848d97" : "#238636";
      case "resolved":
        return "#a371f7";
      case "closed":
        return "#f85149";
      case "merged":
        return "#8250df";
      case "declined":
        return "#f85149";
      case "superseded":
        return "#848d97";
      default:
        return "#848d97";
    }
  }
}
