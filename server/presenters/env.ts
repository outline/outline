import { IntegrationType, PublicEnv } from "@shared/types";
import { Environment } from "@server/env";
import { Integration } from "@server/models";

// Note: This entire object is stringified in the HTML exposed to the client
// do not add anything here that should be a secret or password
export default function present(
  env: Environment,
  options: {
    analytics?: Integration<IntegrationType.Analytics> | null;
    rootShareId?: string | null;
  } = {}
): PublicEnv {
  return {
    ROOT_SHARE_ID: options.rootShareId || undefined,
    analytics: {
      service: options.analytics?.service,
      settings: options.analytics?.settings,
    },
    ...env.public,
  };
}
