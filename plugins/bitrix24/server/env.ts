import { IsOptional } from "class-validator";
import { Environment } from "@server/env";
import { Public } from "@server/utils/decorators/Public";
import environment from "@server/utils/environment";
import { CannotUseWithout } from "@server/utils/validators";

class Bitrix24PluginEnvironment extends Environment {
  /**
   * Bitrix24 portal domain (e.g., yourcompany.bitrix24.com or yourcompany.bitrix24.ru)
   */
  @Public
  @IsOptional()
  public BITRIX24_DOMAIN = this.toOptionalString(environment.BITRIX24_DOMAIN);

  /**
   * Bitrix24 OAuth application client ID
   */
  @Public
  @IsOptional()
  public BITRIX24_CLIENT_ID = this.toOptionalString(
    environment.BITRIX24_CLIENT_ID
  );

  /**
   * Bitrix24 OAuth application client secret
   */
  @IsOptional()
  @CannotUseWithout("BITRIX24_CLIENT_ID")
  public BITRIX24_CLIENT_SECRET = this.toOptionalString(
    environment.BITRIX24_CLIENT_SECRET
  );
}

export default new Bitrix24PluginEnvironment();
