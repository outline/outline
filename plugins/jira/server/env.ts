import { IsOptional } from "class-validator";
import { Environment } from "@server/env";
import { Public } from "@server/utils/decorators/Public";
import environment from "@server/utils/environment";
import { CannotUseWithout } from "@server/utils/validators";

class JiraPluginEnvironment extends Environment {
  /**
   * Jira instance URL (e.g., https://your-domain.atlassian.net)
   */
  @Public
  @IsOptional()
  public JIRA_URL = this.toOptionalString(environment.JIRA_URL);

  /**
   * Jira email for app token authentication.
   */
  @Public
  @IsOptional()
  public JIRA_EMAIL = this.toOptionalString(environment.JIRA_EMAIL);

  /**
   * Jira app token for authentication.
   */
  @IsOptional()
  @CannotUseWithout("JIRA_EMAIL")
  public JIRA_APP_TOKEN = this.toOptionalString(environment.JIRA_APP_TOKEN);

  /**
   * Custom fields configuration for Jira issues.
   * Format: JSON string with array of objects containing field and label properties.
   * Example: [{"field": "customfield_10285", "label": "Module Group"}, {"field": "customfield_10097", "label": "Module"}]
   */
  @Public
  @IsOptional()
  public JIRA_CUSTOM_FIELDS = this.toOptionalString(
    environment.JIRA_CUSTOM_FIELDS
  );

  constructor() {
    super();
  }
}

export default new JiraPluginEnvironment();
