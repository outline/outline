/* eslint-disable flowtype/require-valid-file-annotation */
import subDays from "date-fns/sub_days";
import TestServer from "fetch-test-server";
import app from "../app";
import { Attachment, Document } from "../models";
import { buildAttachment, buildDocument } from "../test/factories";
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

  it("should destroy attachments no longer referenced", async () => {
    const document = await buildDocument({
      publishedAt: subDays(new Date(), 90),
      deletedAt: subDays(new Date(), 60),
    });

    const attachment = await buildAttachment({
      teamId: document.teamId,
      documentId: document.id,
    });

    document.text = `![text](${attachment.redirectUrl})`;
    await document.save();

    const res = await server.post("/api/utils.gc", {
      body: {
        token: process.env.UTILS_SECRET,
      },
    });

    expect(res.status).toEqual(200);
    expect(await Attachment.count()).toEqual(0);
    expect(await Document.unscoped().count({ paranoid: false })).toEqual(0);
  });

  it("should handle unknown attachment ids", async () => {
    const document = await buildDocument({
      publishedAt: subDays(new Date(), 90),
      deletedAt: subDays(new Date(), 60),
    });

    const attachment = await buildAttachment({
      teamId: document.teamId,
      documentId: document.id,
    });

    document.text = `![text](${attachment.redirectUrl})`;
    await document.save();

    // remove attachment so it no longer exists in the database, this is also
    // representative of a corrupt attachment id in the doc or the regex returning
    // an incorrect string
    await attachment.destroy({ force: true });

    const res = await server.post("/api/utils.gc", {
      body: {
        token: process.env.UTILS_SECRET,
      },
    });

    expect(res.status).toEqual(200);
    expect(await Attachment.count()).toEqual(0);
    expect(await Document.unscoped().count({ paranoid: false })).toEqual(0);
  });

  it("should not destroy attachments referenced in other documents", async () => {
    const document1 = await buildDocument();

    const document = await buildDocument({
      teamId: document1.teamId,
      publishedAt: subDays(new Date(), 90),
      deletedAt: subDays(new Date(), 60),
    });

    const attachment = await buildAttachment({
      teamId: document1.teamId,
      documentId: document.id,
    });

    document1.text = `![text](${attachment.redirectUrl})`;
    await document1.save();

    document.text = `![text](${attachment.redirectUrl})`;
    await document.save();

    expect(await Attachment.count()).toEqual(1);

    const res = await server.post("/api/utils.gc", {
      body: {
        token: process.env.UTILS_SECRET,
      },
    });

    expect(res.status).toEqual(200);
    expect(await Attachment.count()).toEqual(1);
    expect(await Document.unscoped().count({ paranoid: false })).toEqual(1);
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

  it("should require authentication", async () => {
    const res = await server.post("/api/utils.gc");
    expect(res.status).toEqual(401);
  });
});
