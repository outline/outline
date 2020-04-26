// @flow
import fs from 'fs-extra';
import path from 'path';

const services = {};

fs
  .readdirSync(__dirname)
  .filter(file => file.indexOf('.') !== 0 && file !== path.basename(__filename))
  .forEach(fileName => {
    const servicePath = path.join(__dirname, fileName);
    const name = servicePath.replace(/\.js$/, '');
    // $FlowIssue
    services[name] = require(servicePath).default;
  });

export default services;
