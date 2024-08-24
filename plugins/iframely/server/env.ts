import { IsOptional, IsUrl } from "class-validator";
import { Environment } from "@server/env";
import environment from "@server/utils/environment";
import { CannotUseWithout } from "@server/utils/validators";

class IframelyPluginEnvironment extends Environment {
  /**
   * Iframely url
   */
  @IsOptional()
  @IsUrl({
    require_tld: false,
    require_protocol: true,
    allow_underscores: true,
    protocols: ["http", "https"],
  })
  public IFRAMELY_URL = environment.IFRAMELY_URL || "https://iframe.ly";

  /**
   * Iframely API key
   */
  @IsOptional()
  @CannotUseWithout("IFRAMELY_URL")
  public IFRAMELY_API_KEY = this.toOptionalString(environment.IFRAMELY_API_KEY);
}

export default new IframelyPluginEnvironment();
