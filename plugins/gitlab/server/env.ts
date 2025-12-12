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

  /**
   * GitLab URL. Defaults to the gitlab cloud URL.
   */
  @Public
  @IsOptional()
  @CannotUseWithout("GITLAB_CLIENT_SECRET")
  public GITLAB_URL =
    this.toOptionalString(environment.GITLAB_URL) ?? "https://gitlab.com";

  /**
   * GitLab OAuth2 client credentials. To enable integration with GitLab.
   */
  @IsOptional()
  @CannotUseWithout("GITLAB_CLIENT_ID")
  public GITLAB_CLIENT_SECRET = this.toOptionalString(
    environment.GITLAB_CLIENT_SECRET
  );
}

export default new GitLabPluginEnvironment();
