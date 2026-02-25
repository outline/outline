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

  /**
   * Comma-separated list of Notion page/database IDs to use as import roots.
   * When set, fetchRootPages() will fetch these directly instead of scanning
   * the entire workspace via the search API. This is necessary for large
   * workspaces (10k+ pages) where search cursor expiration prevents a full
   * scan from completing.
   *
   * To find a page ID: open the page in Notion > Share > Copy link.
   * The ID is the 32-char hex string before the ?v= parameter:
   *   https://notion.so/workspace/Page-Title-<PAGE_ID>?v=...
   *
   * Example: NOTION_ROOT_PAGE_IDS=0e1a242c18a04ae5a63dd17b2cf702f2,d0f0beed48a7461298762c5af0b58ab
   */
  @IsOptional()
  public NOTION_ROOT_PAGE_IDS = this.toOptionalString(
    environment.NOTION_ROOT_PAGE_IDS
  );
}

export default new NotionPluginEnvironment();
