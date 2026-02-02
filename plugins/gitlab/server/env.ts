import { IsOptional } from "class-validator";
import { Environment } from "@server/env";
import { Public } from "@server/utils/decorators/Public";
import environment from "@server/utils/environment";
import { CannotUseWithout } from "@server/utils/validators";

class GitLabPluginEnvironment extends Environment {
  /**
   * GitLab OAuth2 application ID. To enable integration with GitLab.
   */
  @Public
  @IsOptional()
  public GITLAB_CLIENT_ID = this.toOptionalString(environment.GITLAB_CLIENT_ID);

  /**
   * GitLab OAuth2 application secret. To enable integration with GitLab.
   */
  @IsOptional()
  @CannotUseWithout("GITLAB_CLIENT_ID")
  public GITLAB_CLIENT_SECRET = this.toOptionalString(
    environment.GITLAB_CLIENT_SECRET
  );

  /**
   * GitLab instance URL. Defaults to https://gitlab.com for GitLab.com.
   * For self-hosted GitLab, set this to your instance URL (e.g., https://gitlab.example.com).
   */
  @Public
  @IsOptional()
  public GITLAB_URL = this.toOptionalString(
    environment.GITLAB_URL || "https://gitlab.com"
  );
}

export default new GitLabPluginEnvironment();
