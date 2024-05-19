import { IsBoolean, IsOptional, IsUrl, MaxLength } from "class-validator";
import { Environment } from "@server/env";
import { Public } from "@server/utils/decorators/Public";
import environment from "@server/utils/environment";
import { CannotUseWithout } from "@server/utils/validators";

class OIDCPluginEnvironment extends Environment {
  /**
   * OIDC client credentials. To enable authentication with any
   * compatible provider.
   */
  @IsOptional()
  @CannotUseWithout("OIDC_CLIENT_SECRET")
  @CannotUseWithout("OIDC_AUTH_URI")
  @CannotUseWithout("OIDC_TOKEN_URI")
  @CannotUseWithout("OIDC_USERINFO_URI")
  @CannotUseWithout("OIDC_DISPLAY_NAME")
  public OIDC_CLIENT_ID = this.toOptionalString(environment.OIDC_CLIENT_ID);

  @IsOptional()
  @CannotUseWithout("OIDC_CLIENT_ID")
  public OIDC_CLIENT_SECRET = this.toOptionalString(
    environment.OIDC_CLIENT_SECRET
  );

  /**
   * The name of the OIDC provider, eg "GitLab" – this will be displayed on the
   * sign-in button and other places in the UI. The default value is:
   * "OpenID Connect".
   */
  @MaxLength(50)
  public OIDC_DISPLAY_NAME = environment.OIDC_DISPLAY_NAME ?? "OpenID Connect";

  /**
   * The OIDC authorization endpoint.
   */
  @IsOptional()
  @IsUrl({
    require_tld: false,
    allow_underscores: true,
  })
  public OIDC_AUTH_URI = this.toOptionalString(environment.OIDC_AUTH_URI);

  /**
   * The OIDC token endpoint.
   */
  @IsOptional()
  @IsUrl({
    require_tld: false,
    allow_underscores: true,
  })
  public OIDC_TOKEN_URI = this.toOptionalString(environment.OIDC_TOKEN_URI);

  /**
   * The OIDC userinfo endpoint.
   */
  @IsOptional()
  @IsUrl({
    require_tld: false,
    allow_underscores: true,
  })
  public OIDC_USERINFO_URI = this.toOptionalString(
    environment.OIDC_USERINFO_URI
  );

  /**
   * The OIDC profile field to use as the username. The default value is
   * "preferred_username".
   */
  public OIDC_USERNAME_CLAIM =
    environment.OIDC_USERNAME_CLAIM ?? "preferred_username";

  /**
   * A space separated list of OIDC scopes to request. Defaults to "openid
   * profile email".
   */
  public OIDC_SCOPES = environment.OIDC_SCOPES ?? "openid profile email";

  /**
   * Disable autoredirect to the OIDC login page if there is only one
   * authentication method and that method is OIDC.
   */
  @Public
  @IsOptional()
  @IsBoolean()
  public OIDC_DISABLE_REDIRECT = this.toOptionalBoolean(
    environment.OIDC_DISABLE_REDIRECT
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
  public OIDC_LOGOUT_URI = this.toOptionalString(environment.OIDC_LOGOUT_URI);
}

export default new OIDCPluginEnvironment();
