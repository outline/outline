import { IsBoolean, IsOptional } from "class-validator";
import { Environment } from "@server/env";
import environment from "@server/utils/environment";

class LocalPluginEnvironment extends Environment {
  /**
   * Enable local email/password authentication.
   * Set to "true" to enable simple username/password login.
   */
  @IsOptional()
  @IsBoolean()
  public LOCAL_AUTH_ENABLED = this.toBoolean(
    environment.LOCAL_AUTH_ENABLED ?? "false"
  );
}

export default new LocalPluginEnvironment();
