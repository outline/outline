import { IsOptional } from "class-validator";
import { Environment } from "@server/env";
import { Public } from "@server/utils/decorators/Public";
import environment from "@server/utils/environment";
import { CannotUseWithout } from "@server/utils/validators";

class ConfluencePluginEnvironment extends Environment {
  /**
   * Confluence instance URL (e.g., https://yourcompany.atlassian.net/wiki)
   */
  @Public
  @IsOptional()
  public CONFLUENCE_URL = this.toOptionalString(environment.CONFLUENCE_URL);

  /**
   * Confluence OAuth client ID
   */
  @Public
  @IsOptional()
  public CONFLUENCE_CLIENT_ID = this.toOptionalString(
    environment.CONFLUENCE_CLIENT_ID
  );

  /**
   * Confluence OAuth client secret
   */
  @IsOptional()
  @CannotUseWithout("CONFLUENCE_CLIENT_ID")
  public CONFLUENCE_CLIENT_SECRET = this.toOptionalString(
    environment.CONFLUENCE_CLIENT_SECRET
  );
}

export default new ConfluencePluginEnvironment();
