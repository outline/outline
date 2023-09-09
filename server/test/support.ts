import { faker } from "@faker-js/faker";
import TestServer from "fetch-test-server";
import sharedEnv from "@shared/env";
import env from "@server/env";
import onerror from "@server/onerror";
import webService from "@server/services/web";
import { sequelize } from "@server/storage/database";

export function getTestServer() {
  const app = webService();
  onerror(app);
  const server = new TestServer(app.callback());

  server.disconnect = async () => {
    await sequelize.close();
    server.close();
  };

  afterAll(server.disconnect);
  beforeEach(setCloudHosted);

  return server;
}

/**
 * Set the environment to be cloud hosted.
 */
export function setCloudHosted() {
  env.URL = sharedEnv.URL = "https://app.outline.dev";
}

/**
 * Set the environment to be self hosted.
 */
export function setSelfHosted() {
  env.URL = sharedEnv.URL = `https://${faker.internet.domainName()}`;
}
