/* eslint-disable flowtype/require-valid-file-annotation */
import TestServer from "fetch-test-server";
import app from "../app";
import { Collection, User } from "../models";
import {
  buildAdmin,
  buildCollection,
  buildFileOperation,
  buildTeam,
  buildUser,
} from "../test/factories";
import { flushdb } from "../test/support";

const server = new TestServer(app.callback());

beforeEach(() => flushdb());
afterAll(() => server.close());

describe("#fileOperations.list", () => {
  it("should return fileOperations list", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const exportData = await buildFileOperation({
      type: "export",
      teamId: team.id,
      userId: admin.id,
    });

    const res = await server.post("/api/fileOperations.list", {
      body: {
        token: admin.getJwtToken(),
        type: "export",
      },
    });

    const body = await res.json();
    const data = body.data[0];

    expect(res.status).toEqual(200);
    expect(body.data.length).toBe(1);
    expect(data.id).toBe(exportData.id);
    expect(data.key).toBe(exportData.key);
    expect(data.url).toBe(exportData.url);
  });

  it("should return exports with collection data", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({
      userId: admin.id,
      teamId: team.id,
    });

    const exportData = await buildFileOperation({
      type: "export",
      teamId: team.id,
      userId: admin.id,
      collectionId: collection.id,
    });

    const res = await server.post("/api/fileOperations.list", {
      body: {
        token: admin.getJwtToken(),
        type: "export",
      },
    });

    const body = await res.json();
    const data = body.data[0];

    expect(res.status).toEqual(200);
    expect(body.data.length).toBe(1);
    expect(data.id).toBe(exportData.id);
    expect(data.key).toBe(exportData.key);
    expect(data.url).toBe(exportData.url);
    expect(data.collection.id).toBe(collection.id);
  });

  it("should return exports with collection data even if collection is deleted", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({
      userId: admin.id,
      teamId: team.id,
    });

    const exportData = await buildFileOperation({
      type: "export",
      teamId: team.id,
      userId: admin.id,
      collectionId: collection.id,
    });

    await collection.destroy();

    const isCollectionPresent = await Collection.findByPk(collection.id);

    expect(isCollectionPresent).toBe(null);

    const res = await server.post("/api/fileOperations.list", {
      body: {
        token: admin.getJwtToken(),
        type: "export",
      },
    });

    const body = await res.json();
    const data = body.data[0];

    expect(res.status).toEqual(200);
    expect(body.data.length).toBe(1);
    expect(data.id).toBe(exportData.id);
    expect(data.key).toBe(exportData.key);
    expect(data.url).toBe(exportData.url);
    expect(data.collection.id).toBe(collection.id);
  });

  it("should return exports with user data even if user is deleted", async () => {
    const team = await buildTeam();
    const admin2 = await buildAdmin({ teamId: team.id });
    const admin = await buildAdmin({ teamId: team.id });
    const collection = await buildCollection({
      userId: admin.id,
      teamId: team.id,
    });

    const exportData = await buildFileOperation({
      type: "export",
      teamId: team.id,
      userId: admin.id,
      collectionId: collection.id,
    });

    await admin.destroy();

    const isAdminPresent = await User.findByPk(admin.id);

    expect(isAdminPresent).toBe(null);

    const res = await server.post("/api/fileOperations.list", {
      body: {
        token: admin2.getJwtToken(),
        type: "export",
      },
    });

    const body = await res.json();
    const data = body.data[0];

    expect(res.status).toEqual(200);
    expect(body.data.length).toBe(1);
    expect(data.id).toBe(exportData.id);
    expect(data.key).toBe(exportData.key);
    expect(data.url).toBe(exportData.url);
    expect(data.user.id).toBe(admin.id);
  });

  it("should require authorization", async () => {
    const user = await buildUser();

    const res = await server.post("/api/fileOperations.list", {
      body: { token: user.getJwtToken(), type: "export" },
    });

    expect(res.status).toEqual(403);
  });
});
