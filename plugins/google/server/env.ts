import { IsOptional } from "class-validator";
import { Environment } from "@server/env";
import environment from "@server/utils/environment";
import { CannotUseWithout } from "@server/utils/validators";

class GooglePluginEnvironment extends Environment {
  /**
   * Google OAuth2 client credentials. To enable authentication with Google.
   */
  @IsOptional()
  @CannotUseWithout("GOOGLE_CLIENT_SECRET")
  public GOOGLE_CLIENT_ID = this.toOptionalString(environment.GOOGLE_CLIENT_ID);

  @IsOptional()
  @CannotUseWithout("GOOGLE_CLIENT_ID")
  public GOOGLE_CLIENT_SECRET = this.toOptionalString(
    environment.GOOGLE_CLIENT_SECRET
  );
}

export default new GooglePluginEnvironment();
