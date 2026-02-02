import { IsOptional } from "class-validator";
import { Environment } from "@server/env";
import { Public } from "@server/utils/decorators/Public";
import environment from "@server/utils/environment";
import { CannotUseWithout } from "@server/utils/validators";

class TrelloPluginEnvironment extends Environment {
  /**
   * Trello API key
   */
  @Public
  @IsOptional()
  public TRELLO_API_KEY = this.toOptionalString(environment.TRELLO_API_KEY);

  /**
   * Trello API secret
   */
  @IsOptional()
  @CannotUseWithout("TRELLO_API_KEY")
  public TRELLO_API_SECRET = this.toOptionalString(
    environment.TRELLO_API_SECRET
  );
}

export default new TrelloPluginEnvironment();
