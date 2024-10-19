import { IsOptional } from "class-validator";
import { Environment } from "@server/env";
import environment from "@server/utils/environment";
import { CannotUseWithout } from "@server/utils/validators";

class AzurePluginEnvironment extends Environment {
  /**
   * Azure OAuth2 client credentials. To enable authentication with Azure.
   */
  @IsOptional()
  @CannotUseWithout("AZURE_CLIENT_SECRET")
  public AZURE_CLIENT_ID = this.toOptionalString(environment.AZURE_CLIENT_ID);

  @IsOptional()
  @CannotUseWithout("AZURE_CLIENT_ID")
  public AZURE_CLIENT_SECRET = this.toOptionalString(
    environment.AZURE_CLIENT_SECRET
  );

  @IsOptional()
  public AZURE_RESOURCE_APP_ID =
    this.toOptionalString(environment.AZURE_RESOURCE_APP_ID) ??
    "00000003-0000-0000-c000-000000000000";

  @IsOptional()
  @CannotUseWithout("AZURE_CLIENT_ID")
  public AZURE_TENANT_ID = this.toOptionalString(environment.AZURE_TENANT_ID);
}

export default new AzurePluginEnvironment();
