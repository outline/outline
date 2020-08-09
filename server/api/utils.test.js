/* eslint-disable flowtype/require-valid-file-annotation */
import subDays from "date-fns/sub_days";
import TestServer from "fetch-test-server";
import app from "../app";
import { Document } from "../models";
import { sequelize } from "../sequelize";
import { buildDocument } from "../test/factories";
import { flushdb } from "../test/support";

const server = new TestServer(app.callback());

beforeEach(() => flushdb());
afterAll(() => server.close());

describe("#utils.gc", () => {
  it("should destroy documents deleted more than 30 days ago", async () => {
    const document = await buildDocument({
      publishedAt: new Date(),
    });

    await sequelize.query(
      `UPDATE documents SET "deletedAt" = '${subDays(
        new Date(),
        60
      ).toISOString()}' WHERE id = '${document.id}'`
    );

    const res = await server.post("/api/utils.gc", {
      body: {
        token: process.env.UTILS_SECRET,
      },
    });
    const reloaded = await Document.scope().findOne({
      where: {
        id: document.id,
      },
      paranoid: false,
    });
    expect(res.status).toEqual(200);
    expect(reloaded).toBe(null);
  });

  it("should destroy draft documents deleted more than 30 days ago", async () => {
    const document = await buildDocument({
      publishedAt: undefined,
    });

    await sequelize.query(
      `UPDATE documents SET "deletedAt" = '${subDays(
        new Date(),
        60
      ).toISOString()}' WHERE id = '${document.id}'`
    );

    const res = await server.post("/api/utils.gc", {
      body: {
        token: process.env.UTILS_SECRET,
      },
    });
    const reloaded = await Document.scope().findOne({
      where: {
        id: document.id,
      },
      paranoid: false,
    });
    expect(res.status).toEqual(200);
    expect(reloaded).toBe(null);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/utils.gc");
    expect(res.status).toEqual(401);
  });
});
