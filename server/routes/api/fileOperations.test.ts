import TestServer from "fetch-test-server";
import { Collection, User, Event, FileOperation } from "@server/models";
import webService from "@server/services/web";
import {
  buildAdmin,
  buildCollection,
  buildFileOperation,
  buildTeam,
  buildUser,
} from "@server/test/factories";
import { flushdb } from "@server/test/support";

const app = webService();
const server = new TestServer(app.callback());

beforeEach(() => flushdb());
afterAll(() => server.close());

describe("#fileOperations.info", () => {
  it("should return fileOperation", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({
      teamId: team.id,
    });
    const exportData = await buildFileOperation({
      type: "export",
      teamId: team.id,
      userId: admin.id,
    });
    const res = await server.post("/api/fileOperations.info", {
      body: {
        id: exportData.id,
        token: admin.getJwtToken(),
        type: "export",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.id).toBe(exportData.id);
    expect(body.data.state).toBe(exportData.state);
  });

  it("should require user to be an admin", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({
      teamId: team.id,
    });
    const user = await buildUser({
      teamId: team.id,
    });
    const exportData = await buildFileOperation({
      type: "export",
      teamId: team.id,
      userId: admin.id,
    });
    const res = await server.post("/api/fileOperations.info", {
      body: {
        id: exportData.id,
        token: user.getJwtToken(),
        type: "export",
      },
    });
    expect(res.status).toEqual(403);
  });
});

describe("#fileOperations.list", () => {
  it("should return fileOperations list", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({
      teamId: team.id,
    });
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
    expect(data.key).toBe(undefined);
    expect(data.state).toBe(exportData.state);
  });

  it("should return exports with collection data", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({
      teamId: team.id,
    });
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
    expect(data.key).toBe(undefined);
    expect(data.state).toBe(exportData.state);
    expect(data.collectionId).toBe(collection.id);
  });

  it("should return exports with collection data even if collection is deleted", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({
      teamId: team.id,
    });
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
    expect(data.key).toBe(undefined);
    expect(data.state).toBe(exportData.state);
    expect(data.collectionId).toBe(collection.id);
  });

  it("should return exports with user data even if user is deleted", async () => {
    const team = await buildTeam();
    const admin2 = await buildAdmin({
      teamId: team.id,
    });
    const admin = await buildAdmin({
      teamId: team.id,
    });
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
    expect(data.key).toBe(undefined);
    expect(data.state).toBe(exportData.state);
    expect(data.user.id).toBe(admin.id);
  });

  it("should require authorization", async () => {
    const user = await buildUser();
    const res = await server.post("/api/fileOperations.list", {
      body: {
        token: user.getJwtToken(),
        type: "export",
      },
    });
    expect(res.status).toEqual(403);
  });
});

describe("#fileOperations.redirect", () => {
  it("should not redirect when file operation is not complete", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({
      teamId: team.id,
    });
    const exportData = await buildFileOperation({
      type: "export",
      teamId: team.id,
      userId: admin.id,
    });
    const res = await server.post("/api/fileOperations.redirect", {
      body: {
        token: admin.getJwtToken(),
        id: exportData.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toEqual("export is not complete yet");
  });
});

describe("#fileOperations.info", () => {
  it("should return file operation", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({
      teamId: team.id,
    });
    const exportData = await buildFileOperation({
      type: "export",
      teamId: team.id,
      userId: admin.id,
    });
    const res = await server.post("/api/fileOperations.info", {
      body: {
        token: admin.getJwtToken(),
        id: exportData.id,
      },
    });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.id).toBe(exportData.id);
    expect(body.data.user.id).toBe(admin.id);
  });

  it("should require authorization", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({
      teamId: team.id,
    });
    const user = await buildUser({
      teamId: team.id,
    });
    const exportData = await buildFileOperation({
      type: "export",
      teamId: team.id,
      userId: admin.id,
    });
    const res = await server.post("/api/fileOperations.info", {
      body: {
        token: user.getJwtToken(),
        id: exportData.id,
      },
    });
    expect(res.status).toBe(403);
  });
});

describe("#fileOperations.delete", () => {
  it("should delete file operation", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({
      teamId: team.id,
    });
    const exportData = await buildFileOperation({
      type: "export",
      teamId: team.id,
      userId: admin.id,
      state: "complete",
    });
    const deleteResponse = await server.post("/api/fileOperations.delete", {
      body: {
        token: admin.getJwtToken(),
        id: exportData.id,
      },
    });
    expect(deleteResponse.status).toBe(200);
    expect(await Event.count()).toBe(1);
    expect(await FileOperation.count()).toBe(0);
  });
});
