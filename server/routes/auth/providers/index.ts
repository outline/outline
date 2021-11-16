import { signin } from "../../../../shared/utils/routeHelpers";
import { requireDirectory } from "../../../utils/fs";

// @ts-expect-error ts-migrate(7034) FIXME: Variable 'providers' implicitly has type 'any[]' i... Remove this comment to see the full error message
const providers = [];
requireDirectory(__dirname).forEach(([module, id]) => {
  // @ts-expect-error ts-migrate(2339) FIXME: Property 'config' does not exist on type 'unknown'... Remove this comment to see the full error message
  const { config, default: router } = module;

  if (id === "index") {
    return;
  }

  if (!config) {
    throw new Error(
      `Auth providers must export a 'config' object, missing in ${id}`
    );
  }

  if (!router || !router.routes) {
    throw new Error(
      `Default export of an auth provider must be a koa-router, missing in ${id}`
    );
  }

  if (config && config.enabled) {
    providers.push({
      id,
      name: config.name,
      enabled: config.enabled,
      authUrl: signin(id),
      router: router,
    });
  }
});

// @ts-expect-error ts-migrate(7005) FIXME: Variable 'providers' implicitly has an 'any[]' typ... Remove this comment to see the full error message
export default providers;
