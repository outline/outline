import { faker } from "@faker-js/faker";
import { WhereOptions } from "sequelize";
import sharedEnv from "@shared/env";
import env from "@server/env";
import { Event } from "@server/models";
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
 * Set the environment to be cloud hosted.
 */
export function setCloudHosted() {
  return (env.URL = sharedEnv.URL = "https://app.outline.dev");
}

/**
 * Set the environment to be self hosted.
 */
export function setSelfHosted() {
  return (env.URL = sharedEnv.URL = faker.internet.domainName());
}

export function findLatestEvent(where: WhereOptions<Event> = {}) {
  return Event.findOne({
    where,
    order: [["createdAt", "DESC"]],
  });
}
