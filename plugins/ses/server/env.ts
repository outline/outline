import { IsOptional } from "class-validator";
import { Environment } from "@server/env";
import environment from "@server/utils/environment";

class SESPluginEnvironment extends Environment {
  /**
   * The region SES is configured in, which defaults to AWS_REGION. SES is only
   * available in a subset of regions, so it is not always the same region used
   * for file storage.
   */
  @IsOptional()
  public AWS_SES_REGION =
    this.toOptionalString(environment.AWS_SES_REGION) ??
    this.toOptionalString(environment.AWS_REGION);

  /**
   * An optional SES configuration set, used to attribute sending events to a
   * destination such as CloudWatch or SNS.
   */
  @IsOptional()
  public AWS_SES_CONFIGURATION_SET = this.toOptionalString(
    environment.AWS_SES_CONFIGURATION_SET
  );
}

export default new SESPluginEnvironment();
