import { Environment } from "@server/env";
import { Public } from "@server/utils/decorators/Public";
import environment from "@server/utils/environment";
import { CannotUseWithout } from "@server/utils/validators";
import { IsOptional } from "class-validator";

class FigmaPluginEnvironment extends Environment {
  /**
   * Figma OAuth2 app client id. To enable integration with Figma.
   */
  @Public
  @IsOptional()
  public FIGMA_CLIENT_ID = this.toOptionalString(environment.FIGMA_CLIENT_ID);

  /**
   * Figma OAuth2 app client secret. To enable integration with Figma.
   */
  @IsOptional()
  @CannotUseWithout("FIGMA_CLIENT_ID")
  public FIGMA_CLIENT_SECRET = this.toOptionalString(
    environment.FIGMA_CLIENT_SECRET
  );
}

export default new FigmaPluginEnvironment();
