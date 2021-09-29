// @flow
import { signin } from "../../../../shared/utils/routeHelpers";
import { requireDirectory } from "../../../utils/fs";

let providers = [];

requireDirectory(__dirname).forEach(([module, id]) => {
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
