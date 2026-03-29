import { IsOptional } from "class-validator";
import { Environment } from "@server/env";
import { Public } from "@server/utils/decorators/Public";
import environment from "@server/utils/environment";
import { CannotUseWithout } from "@server/utils/validators";

class GitLabPluginEnvironment extends Environment {
  /**
   * GitLab OAuth2 client credentials. To enable integration with GitLab cloud.
   */
  @Public
  @IsOptional()
  public GITLAB_CLIENT_ID = this.toOptionalString(environment.GITLAB_CLIENT_ID);

  /**
   * GitLab OAuth2 client secret used for OAuth2 authentication with GitLab cloud.
   */
  @IsOptional()
  @CannotUseWithout("GITLAB_CLIENT_ID")
  public GITLAB_CLIENT_SECRET = this.toOptionalString(
    environment.GITLAB_CLIENT_SECRET
  );
}

export default new GitLabPluginEnvironment();
