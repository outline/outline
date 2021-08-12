/* eslint-disable flowtype/require-valid-file-annotation */
import { subDays } from "date-fns";
import TestServer from "fetch-test-server";
import app from "../app";
import { Document, Export } from "../models";
import { Op } from "../sequelize";
import { buildDocument, buildExport } from "../test/factories";
import { flushdb } from "../test/support";

const server = new TestServer(app.callback());

jest.mock("aws-sdk", () => {
  const mS3 = { deleteObject: jest.fn().mockReturnThis(), promise: jest.fn() };
  return {
    S3: jest.fn(() => mS3),
    Endpoint: jest.fn(),
  };
});

beforeEach(() => flushdb());
afterAll(() => server.close());

describe("#utils.gc", () => {
  it("should not destroy documents not deleted", async () => {
    await buildDocument({
      publishedAt: new Date(),
    });

    const res = await server.post("/api/utils.gc", {
      body: {
        token: process.env.UTILS_SECRET,
      },
    });

    expect(res.status).toEqual(200);
    expect(await Document.unscoped().count({ paranoid: false })).toEqual(1);
  });

  it("should not destroy documents deleted less than 30 days ago", async () => {
    await buildDocument({
      publishedAt: new Date(),
      deletedAt: subDays(new Date(), 25),
    });

    const res = await server.post("/api/utils.gc", {
      body: {
        token: process.env.UTILS_SECRET,
      },
    });

    expect(res.status).toEqual(200);
    expect(await Document.unscoped().count({ paranoid: false })).toEqual(1);
  });

  it("should destroy documents deleted more than 30 days ago", async () => {
    await buildDocument({
      publishedAt: new Date(),
      deletedAt: subDays(new Date(), 60),
    });

    const res = await server.post("/api/utils.gc", {
      body: {
        token: process.env.UTILS_SECRET,
      },
    });

    expect(res.status).toEqual(200);
    expect(await Document.unscoped().count({ paranoid: false })).toEqual(0);
  });

  it("should destroy draft documents deleted more than 30 days ago", async () => {
    await buildDocument({
      publishedAt: undefined,
      deletedAt: subDays(new Date(), 60),
    });

    const res = await server.post("/api/utils.gc", {
      body: {
        token: process.env.UTILS_SECRET,
      },
    });
    expect(res.status).toEqual(200);
    expect(await Document.unscoped().count({ paranoid: false })).toEqual(0);
  });

  it("should expire exports older than 30 days ago", async () => {
    await buildExport({
      state: "complete",
      createdAt: subDays(new Date(), 30),
    });

    await buildExport({
      state: "complete",
    });

    const res = await server.post("/api/utils.gc", {
      body: {
        token: process.env.UTILS_SECRET,
      },
    });

    const data = await Export.count({
      where: {
        state: {
          [Op.eq]: "expired",
        },
      },
    });

    expect(res.status).toEqual(200);
    expect(data).toEqual(1);
  });

  it("should not expire exports made less than 30 days ago", async () => {
    await buildExport({
      state: "complete",
      createdAt: subDays(new Date(), 29),
    });

    await buildExport({
      state: "complete",
    });

    const res = await server.post("/api/utils.gc", {
      body: {
        token: process.env.UTILS_SECRET,
      },
    });

    const data = await Export.count({
      where: {
        state: {
          [Op.eq]: "expired",
        },
      },
    });

    expect(res.status).toEqual(200);
    expect(data).toEqual(0);
  });

  it("should require authentication", async () => {
    const res = await server.post("/api/utils.gc");
    expect(res.status).toEqual(401);
  });
});
