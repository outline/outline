import { IsOptional } from "class-validator";
import { Environment } from "@server/env";
import { Public } from "@server/utils/decorators/Public";
import environment from "@server/utils/environment";
import { CannotUseWithout } from "@server/utils/validators";

class JiraPluginEnvironment extends Environment {
  /**
   * Jira instance URL (e.g., https://yourcompany.atlassian.net)
   */
  @Public
  @IsOptional()
  public JIRA_URL = this.toOptionalString(environment.JIRA_URL);

  /**
   * Jira OAuth consumer key
   */
  @Public
  @IsOptional()
  public JIRA_CONSUMER_KEY = this.toOptionalString(
    environment.JIRA_CONSUMER_KEY
  );

  /**
   * Jira OAuth consumer secret
   */
  @IsOptional()
  @CannotUseWithout("JIRA_CONSUMER_KEY")
  public JIRA_CONSUMER_SECRET = this.toOptionalString(
    environment.JIRA_CONSUMER_SECRET
  );

  /**
   * Jira OAuth access token (for OAuth 1.0a) or client ID (for OAuth 2.0)
   */
  @IsOptional()
  @CannotUseWithout("JIRA_CONSUMER_KEY")
  public JIRA_ACCESS_TOKEN = this.toOptionalString(
    environment.JIRA_ACCESS_TOKEN
  );

  /**
   * Jira OAuth token secret (for OAuth 1.0a) or client secret (for OAuth 2.0)
   */
  @IsOptional()
  @CannotUseWithout("JIRA_ACCESS_TOKEN")
  public JIRA_TOKEN_SECRET = this.toOptionalString(
    environment.JIRA_TOKEN_SECRET
  );
}

export default new JiraPluginEnvironment();
