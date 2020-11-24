// @flow
import path from "path";
import debug from "debug";
import fs from "fs-extra";

const log = debug("services");
const services = {};

fs.readdirSync(__dirname)
  .filter(
    (file) =>
      file.indexOf(".") !== 0 &&
      file !== path.basename(__filename) &&
      !file.includes(".test")
  )
  .forEach((fileName) => {
    const servicePath = path.join(__dirname, fileName);
    const name = path.basename(servicePath.replace(/\.js$/, ""));
    // $FlowIssue
    const Service = require(servicePath).default;
    services[name] = new Service();
    log(`loaded ${name} service`);
  });

export default services;
