import { Environment } from "@server/env";
import { Public } from "@server/utils/decorators/Public";
import environment from "@server/utils/environment";
import { CannotUseWithout } from "@server/utils/validators";

class NotionPluginEnvironment extends Environment {
  @Public
  public NOTION_CLIENT_ID = environment.NOTION_CLIENT_ID;

  @CannotUseWithout("NOTION_CLIENT_ID")
  public NOTION_CLIENT_SECRET = environment.NOTION_CLIENT_SECRET;
}

export default new NotionPluginEnvironment();
