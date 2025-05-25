import { IsOptional } from "class-validator";
import { Environment } from "@server/env";
import { Public } from "@server/utils/decorators/Public";
import environment from "@server/utils/environment";
import { CannotUseWithout } from "@server/utils/validators";

class NotionPluginEnvironment extends Environment {
  @Public
  @IsOptional()
  public NOTION_CLIENT_ID = this.toOptionalString(environment.NOTION_CLIENT_ID);

  @IsOptional()
  @CannotUseWithout("NOTION_CLIENT_ID")
  public NOTION_CLIENT_SECRET = this.toOptionalString(
    environment.NOTION_CLIENT_SECRET
  );
}

export default new NotionPluginEnvironment();
