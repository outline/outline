import { faker } from "@faker-js/faker";
import sharedEnv from "@shared/env";
import env from "@server/env";
import onerror from "@server/onerror";
import webService from "@server/services/web";
import { sequelize } from "@server/storage/database";
import TestServer from "./TestServer";

export function getTestServer() {
  const app = webService();
  onerror(app);
  const server = new TestServer(app);

  const disconnect = async () => {
    await sequelize.close();
    return server.close();
  };

  afterAll(disconnect);

  return server;
}

/**
 * Set the environment to be self hosted.
 */
export function setSelfHosted() {
  env.URL = sharedEnv.URL = `https://${faker.internet.domainName()}`;
}
