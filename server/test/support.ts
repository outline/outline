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

  setupTestDatabase();
  afterAll(server.disconnect);

  return server;
}

export function setupTestDatabase() {
  const flush = async () => {
    const sql = sequelize.getQueryInterface();
    const tables = Object.keys(sequelize.models).map((model) => {
      const n = sequelize.models[model].getTableName();
      return (sql.queryGenerator as any).quoteTable(
        typeof n === "string" ? n : n.tableName
      );
    });
    const flushQuery = `TRUNCATE ${tables.join(", ")} CASCADE`;

    await sequelize.query(flushQuery);
  };

  const disconnect = async () => {
    await sequelize.close();
  };

  afterAll(disconnect);
  beforeEach(flush);
}

/**
 * Set the environment to be cloud hosted
 */
export function setCloudHosted() {
  return (env.URL = sharedEnv.URL = "https://app.outline.dev");
}

/**
 * Set the environment to be self hosted
 */
export function setSelfHosted() {
  return (env.URL = sharedEnv.URL = "https://wiki.example.com");
}
