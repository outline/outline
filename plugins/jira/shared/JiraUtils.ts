import clientEnv from "@shared/env";

export class JiraUtils {
  public static url = clientEnv.JIRA_URL;
  public static email = clientEnv.JIRA_EMAIL;

  public static isConfigured(): boolean {
    return !!(this.url && this.email);
  }
}
