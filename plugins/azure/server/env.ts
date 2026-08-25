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

  /**
   * Client credentials used to send email through the Microsoft Graph API,
   * enabled with EMAIL_PROVIDER=msgraph. These are deliberately separate from
   * the authentication credentials above – the app registration used here must
   * be granted the Mail.Send application permission, so set them explicitly
   * even when reusing the sign-in app. Application-level Mail.Send allows
   * sending as any mailbox in the tenant unless it is narrowed to specific
   * mailboxes with Exchange Online's role based access control for
   * applications.
   * See https://learn.microsoft.com/en-us/graph/auth-limit-mailbox-access
   */
  @IsOptional()
  public AZURE_MAIL_CLIENT_ID = this.toOptionalString(
    environment.AZURE_MAIL_CLIENT_ID
  );

  @IsOptional()
  @CannotUseWithout("AZURE_MAIL_CLIENT_ID")
  public AZURE_MAIL_CLIENT_SECRET = this.toOptionalString(
    environment.AZURE_MAIL_CLIENT_SECRET
  );

  @IsOptional()
  @CannotUseWithout("AZURE_MAIL_CLIENT_ID")
  public AZURE_MAIL_TENANT_ID = this.toOptionalString(
    environment.AZURE_MAIL_TENANT_ID
  );

  /**
   * The mailbox to send from, either a user principal name or object id.
   * Defaults to the address in SMTP_FROM_EMAIL, and only needs setting when the
   * sending mailbox differs from the address emails appear to come from.
   */
  @IsOptional()
  public AZURE_MAIL_FROM_USER_ID = this.toOptionalString(
    environment.AZURE_MAIL_FROM_USER_ID
  );

  /**
   * Login and Graph endpoints, which only need overriding for sovereign clouds
   * such as US Government (graph.microsoft.us) or China (microsoftgraph.chinacloudapi.cn).
   * See https://learn.microsoft.com/en-us/graph/deployments
   */
  @IsOptional()
  public AZURE_MAIL_AUTHORITY_URL =
    this.toOptionalString(environment.AZURE_MAIL_AUTHORITY_URL) ??
    "https://login.microsoftonline.com";

  @IsOptional()
  public AZURE_MAIL_GRAPH_BASE_URL =
    this.toOptionalString(environment.AZURE_MAIL_GRAPH_BASE_URL) ??
    "https://graph.microsoft.com";
}

export default new AzurePluginEnvironment();
