import type { IntegrationType, PublicEnv } from "@shared/types";
import type { Environment } from "@server/env";
import type { Integration } from "@server/models";

// Note: This entire object is stringified in the HTML exposed to the client
// do not add anything here that should be a secret or password
export default function present(
  env: Environment,
  options: {
    analytics?: Integration<IntegrationType.Analytics>[];
    rootShareId?: string | null;
  } = {}
): PublicEnv {
  return {
    ROOT_SHARE_ID: options.rootShareId || undefined,
    analytics: (options.analytics ?? []).map((integration) => ({
      service: integration?.service,
      settings: integration?.settings,
    })),
    ...env.public,
  };
}
