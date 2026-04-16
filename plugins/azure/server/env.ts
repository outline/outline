import { IsOptional } from "class-validator";
import { Environment } from "@server/env";
import environment from "@server/utils/environment";
import { CannotUseWithout } from "@server/utils/validators";

class AzurePluginEnvironment extends Environment {
  /**
   * Azure OAuth2 client credentials. To enable authentication with Azure.
   */
  @IsOptional()
  public AZURE_CLIENT_ID = this.toOptionalString(environment.AZURE_CLIENT_ID);

  @IsOptional()
  @CannotUseWithout("AZURE_CLIENT_ID")
  public AZURE_CLIENT_SECRET = this.toOptionalString(
    environment.AZURE_CLIENT_SECRET
  );

  /**
   * When true, uses the hosting platform's managed identity to authenticate
   * with Azure AD instead of a client secret. Requires a federated identity
   * credential configured on the Entra app registration trusting the managed
   * identity. This eliminates the need to store and rotate client secrets.
   *
   * @see https://learn.microsoft.com/en-us/entra/workload-id/workload-identity-federation
   */
  @IsOptional()
  @CannotUseWithout("AZURE_CLIENT_ID")
  public AZURE_USE_MANAGED_IDENTITY = this.toBoolean(
    environment.AZURE_USE_MANAGED_IDENTITY ?? "false"
  );

  /**
   * Client ID of a user-assigned managed identity. Only required when using
   * a user-assigned identity; omit for system-assigned identities.
   */
  @IsOptional()
  @CannotUseWithout("AZURE_USE_MANAGED_IDENTITY")
  public AZURE_MANAGED_IDENTITY_CLIENT_ID = this.toOptionalString(
    environment.AZURE_MANAGED_IDENTITY_CLIENT_ID
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
