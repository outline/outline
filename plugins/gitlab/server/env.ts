import { IsOptional } from "class-validator";
import { Environment } from "@server/env";
import { Public } from "@server/utils/decorators/Public";
import environment from "@server/utils/environment";
import { CannotUseWithout } from "@server/utils/validators";

class GitLabPluginEnvironment extends Environment {
  /**
   * GitLab OAuth2 client credentials. To enable integration with GitLab.
   */
  @Public
  @IsOptional()
  public GITLAB_CLIENT_ID = this.toOptionalString(environment.GITLAB_CLIENT_ID);

  @Public
  @IsOptional()
  @CannotUseWithout("GITLAB_CLIENT_ID")
  public GITLAB_APP_NAME = this.toOptionalString(environment.GITLAB_APP_NAME);

  /**
   * GitLab OAuth2 client credentials. To enable integration with GitLab.
   */
  @IsOptional()
  @CannotUseWithout("GITLAB_CLIENT_ID")
  public GITLAB_CLIENT_SECRET = this.toOptionalString(
    environment.GITLAB_CLIENT_SECRET
  );

  @IsOptional()
  @CannotUseWithout("GITLAB_CLIENT_ID")
  public GITLAB_WEBHOOK_SECRET = this.toOptionalString(
    environment.GITLAB_WEBHOOK_SECRET
  );
}

export default new GitLabPluginEnvironment();
