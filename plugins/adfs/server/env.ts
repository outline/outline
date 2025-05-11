import { IsBoolean, IsOptional, IsUrl, MaxLength } from "class-validator";
import { Environment } from "@server/env";
import { Public } from "@server/utils/decorators/Public";
import environment from "@server/utils/environment";
import { CannotUseWithout } from "@server/utils/validators";

class ADFSPluginEnvironment extends Environment {
  /**
   * OIDC client credentials. To enable authentication with any
   * compatible provider.
   */
  @IsOptional()
  @CannotUseWithout("ADFS_CLIENT_SECRET")
  @CannotUseWithout("ADFS_AUTH_URI")
  @CannotUseWithout("ADFS_TOKEN_URI")
  @CannotUseWithout("ADFS_USERINFO_URI")
  @CannotUseWithout("ADFS_DISPLAY_NAME")
  public ADFS_CLIENT_ID = this.toOptionalString(environment.ADFS_CLIENT_ID);

  @IsOptional()
  @CannotUseWithout("ADFS_CLIENT_ID")
  public ADFS_CLIENT_SECRET = this.toOptionalString(
    environment.ADFS_CLIENT_SECRET
  );

  /**
   * The name of the OIDC provider, eg "GitLab" – this will be displayed on the
   * sign-in button and other places in the UI. The default value is:
   * "OpenID Connect".
   */
  @MaxLength(50)
  public ADFS_DISPLAY_NAME =
    environment.ADFS_DISPLAY_NAME ?? "Active Directory Federation Services";

  /**
   * The OIDC authorization endpoint.
   */
  @IsOptional()
  @IsUrl({
    require_tld: false,
    allow_underscores: true,
  })
  public ADFS_AUTH_URI = this.toOptionalString(environment.ADFS_AUTH_URI);

  /**
   * The OIDC token endpoint.
   */
  @IsOptional()
  @IsUrl({
    require_tld: false,
    allow_underscores: true,
  })
  public ADFS_TOKEN_URI = this.toOptionalString(environment.ADFS_TOKEN_URI);

  /**
   * The OIDC userinfo endpoint.
   */
  @IsOptional()
  @IsUrl({
    require_tld: false,
    allow_underscores: true,
  })
  public ADFS_USERINFO_URI = this.toOptionalString(
    environment.ADFS_USERINFO_URI
  );

  /**
   * A space separated list of OIDC scopes to request. Defaults to "openid
   * profile email".
   */
  public ADFS_SCOPES = environment.ADFS_SCOPES ?? "openid profile email";

  /**
   * Disable autoredirect to the OIDC login page if there is only one
   * authentication method and that method is OIDC.
   */
  @Public
  @IsOptional()
  @IsBoolean()
  public ADFS_DISABLE_REDIRECT = this.toOptionalBoolean(
    environment.ADFS_DISABLE_REDIRECT
  );

  /**
   * The OIDC logout endpoint.
   */
  @Public
  @IsOptional()
  @IsUrl({
    require_tld: false,
    allow_underscores: true,
  })
  public ADFS_LOGOUT_URI = this.toOptionalString(environment.ADFS_LOGOUT_URI);
}

export default new ADFSPluginEnvironment();
