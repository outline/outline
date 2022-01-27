import Router from "koa-router";
import { signin } from "@shared/utils/urlHelpers";
import { requireDirectory } from "@server/utils/fs";

interface AuthenicationProvider {
  id: string;
  name: string;
  enabled: boolean;
  authUrl: string;
  router: Router;
}

const providers: AuthenicationProvider[] = [];

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

export default providers;
