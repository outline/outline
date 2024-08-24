import { IsBoolean, IsOptional } from "class-validator";
import { Environment } from "@server/env";
import Deprecated from "@server/models/decorators/Deprecated";
import { Public } from "@server/utils/decorators/Public";
import environment from "@server/utils/environment";
import { CannotUseWithout } from "@server/utils/validators";

class SlackPluginEnvironment extends Environment {
  /**
   * Slack OAuth2 client credentials. To enable authentication with Slack.
   */
  @Public
  @IsOptional()
  public SLACK_CLIENT_ID = this.toOptionalString(
    environment.SLACK_CLIENT_ID ?? environment.SLACK_KEY
  );

  /**
   * Injected into the `slack-app-id` header meta tag if provided.
   */
  @Public
  @IsOptional()
  @CannotUseWithout("SLACK_CLIENT_ID")
  public SLACK_APP_ID = this.toOptionalString(environment.SLACK_APP_ID);

  @IsOptional()
  @Deprecated("Use SLACK_CLIENT_SECRET instead")
  public SLACK_SECRET = this.toOptionalString(environment.SLACK_SECRET);

  @IsOptional()
  @Deprecated("Use SLACK_CLIENT_ID instead")
  public SLACK_KEY = this.toOptionalString(environment.SLACK_KEY);

  @IsOptional()
  @CannotUseWithout("SLACK_CLIENT_ID")
  public SLACK_CLIENT_SECRET = this.toOptionalString(
    environment.SLACK_CLIENT_SECRET ?? environment.SLACK_SECRET
  );

  /**
   * Secret to verify webhook requests received from Slack.
   */
  @IsOptional()
  public SLACK_VERIFICATION_TOKEN = this.toOptionalString(
    environment.SLACK_VERIFICATION_TOKEN
  );

  /**
   * If enabled a "Post to Channel" button will be added to search result
   * messages inside of Slack. This also requires setup in Slack UI.
   */
  @IsOptional()
  @IsBoolean()
  public SLACK_MESSAGE_ACTIONS = this.toBoolean(
    environment.SLACK_MESSAGE_ACTIONS ?? "false"
  );
}

export default new SlackPluginEnvironment();
