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

  /**
   * The email address of a service account used to send email through the Gmail
   * API, enabled with EMAIL_PROVIDER=gmail. The service account must be granted
   * domain-wide delegation for the gmail.send scope in the Workspace admin
   * console, which is what allows it to send on a mailbox's behalf.
   * See https://developers.google.com/identity/protocols/oauth2/service-account
   */
  @IsOptional()
  public GOOGLE_MAIL_CLIENT_EMAIL = this.toOptionalString(
    environment.GOOGLE_MAIL_CLIENT_EMAIL
  );

  /**
   * The PEM-encoded private key belonging to the service account, or a
   * base64-encoded PEM string on a single line.
   */
  @IsOptional()
  @CannotUseWithout("GOOGLE_MAIL_CLIENT_EMAIL")
  public GOOGLE_MAIL_PRIVATE_KEY = this.toOptionalString(
    environment.GOOGLE_MAIL_PRIVATE_KEY
  );

  /**
   * The mailbox to impersonate when sending. Defaults to the address in
   * SMTP_FROM_EMAIL. When set to a different mailbox, Gmail rewrites the From
   * header to this address unless the SMTP_FROM_EMAIL address is configured as
   * a send-as alias of it.
   */
  @IsOptional()
  public GOOGLE_MAIL_FROM_USER_ID = this.toOptionalString(
    environment.GOOGLE_MAIL_FROM_USER_ID
  );
}

export default new GooglePluginEnvironment();
