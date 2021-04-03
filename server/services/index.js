// @flow
import debug from "debug";
import { requireDirectory } from "../utils/fs";

const log = debug("services");
const services = {};

if (!process.env.SINGLE_RUN) {
  requireDirectory(__dirname).forEach(([module, name]) => {
    if (module && module.default) {
      const Service = module.default;
      services[name] = new Service();
      log(`loaded ${name} service`);
    }
  });
}

export default services;
