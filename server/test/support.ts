import { faker } from "@faker-js/faker";
import { Transaction } from "sequelize";
import sharedEnv from "@shared/env";
import { createContext } from "@server/context";
import env from "@server/env";
import { User } from "@server/models";
import onerror from "@server/onerror";
import webService from "@server/services/web";
import { sequelize } from "@server/storage/database";
import { APIContext, AuthenticationType } from "@server/types";
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

export function withAPIContext<T>(
  user: User,
  fn: (ctx: APIContext) => T
): Promise<T> {
  return sequelize.transaction(async (transaction: Transaction) => {
    const state = {
      auth: {
        user,
        type: AuthenticationType.APP,
        token: user.getJwtToken(),
      },
      transaction,
    };
    return fn({
      ...createContext({ user, transaction }),
      state,
      request: {
        ip: faker.internet.ip(),
      },
    } as APIContext);
  });
}

/**
 * Helper function to convert an object to form-urlencoded string.
 * Useful for testing OAuth endpoints that expect application/x-www-form-urlencoded content type.
 *
 * @param obj Object to convert to form-urlencoded string
 * @returns Form-urlencoded string representation of the object
 */
export function toFormData(obj: Record<string, any>): string {
  return Object.entries(obj)
    .filter(([_, value]) => value !== undefined)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
    )
    .join("&");
}
