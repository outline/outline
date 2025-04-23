import { IsOptional } from "class-validator";
import { Environment } from "@server/env";
import { Public } from "@server/utils/decorators/Public";
import environment from "@server/utils/environment";
import { CannotUseWithout } from "@server/utils/validators";

class LinearPluginEnvironment extends Environment {
  /**
   * Linear OAuth2 app client id. To enable integration with Linear.
   */
  @Public
  @IsOptional()
  public LINEAR_CLIENT_ID = this.toOptionalString(environment.LINEAR_CLIENT_ID);

  /**
   * Linear OAuth2 app client secret. To enable integration with Linear.
   */
  @IsOptional()
  @CannotUseWithout("LINEAR_CLIENT_ID")
  public LINEAR_CLIENT_SECRET = this.toOptionalString(
    environment.LINEAR_CLIENT_SECRET
  );
}

export default new LinearPluginEnvironment();
