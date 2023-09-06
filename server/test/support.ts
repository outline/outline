import TestServer from "fetch-test-server";
import { WhereOptions } from "sequelize";
import sharedEnv from "@shared/env";
import env from "@server/env";
import { Event, Team } from "@server/models";
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
export async function setSelfHosted() {
  env.URL = sharedEnv.URL = "https://wiki.example.com";

  // Self hosted deployments only have one team, to ensure behavior is correct
  // we need to delete all teams before running tests
  return Team.destroy({
    truncate: true,
  });
}

export function findLatestEvent(where: WhereOptions<Event> = {}) {
  return Event.findOne({
    where,
    order: [["createdAt", "DESC"]],
  });
}
