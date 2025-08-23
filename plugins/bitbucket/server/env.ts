import { IsOptional } from "class-validator";
import { Environment } from "@server/env";
import { Public } from "@server/utils/decorators/Public";
import environment from "@server/utils/environment";
import { CannotUseWithout } from "@server/utils/validators";

class BitbucketPluginEnvironment extends Environment {
  /**
   * Bitbucket username for app password authentication.
   */
  @Public
  @IsOptional()
  public BITBUCKET_USERNAME = this.toOptionalString(
    environment.BITBUCKET_USERNAME
  );

  /**
   * Bitbucket app password for authentication.
   */
  @IsOptional()
  @CannotUseWithout("BITBUCKET_USERNAME")
  public BITBUCKET_APP_PASSWORD = this.toOptionalString(
    environment.BITBUCKET_APP_PASSWORD
  );

  constructor() {
    super();
  }

  /**
   * Bitbucket webhook secret for validating webhook requests.
   */
  @IsOptional()
  @CannotUseWithout("BITBUCKET_USERNAME")
  public BITBUCKET_WEBHOOK_SECRET = this.toOptionalString(
    environment.BITBUCKET_WEBHOOK_SECRET
  );
}

export default new BitbucketPluginEnvironment();
