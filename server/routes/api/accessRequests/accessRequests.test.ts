import { DocumentPermission } from "@shared/types";
import { AccessRequest, UserMembership } from "@server/models";
import { AccessRequestStatus } from "@server/models/AccessRequest";
import {
  buildAdmin,
  buildDocument,
  buildTeam,
  buildUser,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("#access_requests.info", () => {
  it("should require authentication", async () => {
    const res = await server.post("/api/access_requests.info");
    expect(res.status).toEqual(401);
  });

  it("should fail if both id and documentSlug are missing", async () => {
    const user = await buildUser();
    const res = await server.post("/api/access_requests.info", {
      body: {
        token: user.getJwtToken(),
      },
    });
    expect(res.status).toEqual(400);
  });

  it("should return access request correctly by id", async () => {
    const team = await buildTeam();
    const requester = await buildUser({ teamId: team.id });
    const admin = await buildAdmin({ teamId: team.id });
    const document = await buildDocument({
      createdById: admin.id,
      teamId: team.id,
    });

    const accessRequest = await AccessRequest.create({
      documentId: document.id,
      userId: requester.id,
      teamId: team.id,
    });

    const res = await server.post("/api/access_requests.info", {
      body: {
        token: requester.getJwtToken(),
        id: accessRequest.id,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.id).toEqual(accessRequest.id);
    expect(body.data.status).toEqual(AccessRequestStatus.Pending);
  });

  it("should return access request correctly by documentSlug", async () => {
    const team = await buildTeam();
    const requester = await buildUser({ teamId: team.id });
    const admin = await buildAdmin({ teamId: team.id });
    const document = await buildDocument({
      createdById: admin.id,
      teamId: team.id,
    });

    const accessRequest = await AccessRequest.create({
      documentId: document.id,
      userId: requester.id,
      teamId: team.id,
    });

    const res = await server.post("/api/access_requests.info", {
      body: {
        token: requester.getJwtToken(),
        documentSlug: document.urlId,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.id).toEqual(accessRequest.id);
    expect(body.data.status).toEqual(AccessRequestStatus.Pending);
  });

  it("should return 404 if access request not found", async () => {
    const user = await buildUser();
    const res = await server.post("/api/access_requests.info", {
      body: {
        token: user.getJwtToken(),
        id: "00000000-0000-0000-0000-000000000000",
      },
    });
    expect(res.status).toEqual(404);
  });
});

describe("#access_requests.approve", () => {
  it("should require authentication", async () => {
    const res = await server.post("/api/access_requests.approve");
    expect(res.status).toEqual(401);
  });

  it("should approve an access request and grant access", async () => {
    const team = await buildTeam();
    const requester = await buildUser({ teamId: team.id });
    const admin = await buildAdmin({ teamId: team.id });
    const document = await buildDocument({
      createdById: admin.id,
      teamId: team.id,
    });

    const accessRequest = await AccessRequest.create({
      documentId: document.id,
      userId: requester.id,
      teamId: team.id,
    });

    const res = await server.post("/api/access_requests.approve", {
      body: {
        token: admin.getJwtToken(),
        id: accessRequest.id,
        permission: DocumentPermission.ReadWrite,
      },
    });
    const body = await res.json();

    expect(body.data.status).toEqual(AccessRequestStatus.Approved);
    expect(body.data.responderId).toEqual(admin.id);

    // // Verify that the user now has access
    const membership = await UserMembership.findOne({
      where: {
        userId: requester.id,
        documentId: document.id,
      },
    });
    expect(membership).toBeTruthy();
    expect(membership?.permission).toEqual(DocumentPermission.ReadWrite);
  });

  it("should not allow non-managers to approve requests", async () => {
    const team = await buildTeam();
    const requester = await buildUser({ teamId: team.id });
    const admin = await buildAdmin({ teamId: team.id });
    const nonManager = await buildUser();
    const document = await buildDocument({
      createdById: admin.id,
      teamId: team.id,
    });

    // add non-manager to the document with editor access
    await UserMembership.create({
      userId: admin.id,
      documentId: document.id,
      createdById: admin.id,
      permission: DocumentPermission.ReadWrite,
    });

    const accessRequest = await AccessRequest.create({
      documentId: document.id,
      userId: requester.id,
      teamId: team.id,
    });

    const res = await server.post("/api/access_requests.approve", {
      body: {
        token: nonManager.getJwtToken(),
        id: accessRequest.id,
        permission: DocumentPermission.ReadWrite,
      },
    });

    expect(res.status).toEqual(403);
  });

  it("should not allow approving requests that have been responded to", async () => {
    const team = await buildTeam();
    const requester = await buildUser({ teamId: team.id });
    const admin = await buildAdmin({ teamId: team.id });
    const document = await buildDocument({
      createdById: admin.id,
      teamId: team.id,
    });

    // Create access request that's already approved
    const accessRequest = await AccessRequest.create({
      documentId: document.id,
      userId: requester.id,
      teamId: team.id,
      status: AccessRequestStatus.Approved,
      responderId: admin.id,
      respondedAt: new Date(),
    });

    const res = await server.post("/api/access_requests.approve", {
      body: {
        token: admin.getJwtToken(),
        id: accessRequest.id,
        permission: DocumentPermission.ReadWrite,
      },
    });

    expect(res.status).toEqual(400);
  });
});

describe("#access_requests.dismiss", () => {
  it("should require authentication", async () => {
    const res = await server.post("/api/access_requests.dismiss");
    expect(res.status).toEqual(401);
  });

  it("should dismiss an access request", async () => {
    const team = await buildTeam();
    const requester = await buildUser({ teamId: team.id });
    const admin = await buildAdmin({ teamId: team.id });
    const document = await buildDocument({
      createdById: admin.id,
      teamId: team.id,
    });

    // Create access request
    const accessRequest = await AccessRequest.create({
      documentId: document.id,
      userId: requester.id,
      teamId: team.id,
    });

    const res = await server.post("/api/access_requests.dismiss", {
      body: {
        token: admin.getJwtToken(),
        id: accessRequest.id,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.status).toEqual(AccessRequestStatus.Dismissed);
    expect(body.data.responderId).toEqual(admin.id);

    const membership = await UserMembership.findOne({
      where: {
        userId: requester.id,
        documentId: document.id,
      },
    });
    expect(membership).toBeNull();
  });

  it("should not allow non-managers to dismiss requests", async () => {
    const team = await buildTeam();
    const requester = await buildUser({ teamId: team.id });
    const admin = await buildAdmin({ teamId: team.id });
    const nonManager = await buildUser();
    const document = await buildDocument({
      userId: admin.id,
      teamId: team.id,
    });

    // add non-manager to the document with editor access
    await UserMembership.create({
      userId: admin.id,
      documentId: document.id,
      createdById: admin.id,
      permission: DocumentPermission.ReadWrite,
    });

    // Create access request
    const accessRequest = await AccessRequest.create({
      documentId: document.id,
      userId: requester.id,
      teamId: team.id,
    });

    const res = await server.post("/api/access_requests.dismiss", {
      body: {
        token: nonManager.getJwtToken(),
        id: accessRequest.id,
      },
    });

    expect(res.status).toEqual(403);
  });

  it("should not allow dismissing requests that have been responded to", async () => {
    const team = await buildTeam();
    const requester = await buildUser({ teamId: team.id });
    const admin = await buildAdmin({ teamId: team.id });
    const document = await buildDocument({
      createdById: admin.id,
      teamId: team.id,
    });

    // Create access request that's already dismissed
    const accessRequest = await AccessRequest.create({
      documentId: document.id,
      userId: requester.id,
      teamId: team.id,
      status: AccessRequestStatus.Dismissed,
      responderId: admin.id,
      respondedAt: new Date(),
    });

    const res = await server.post("/api/access_requests.dismiss", {
      body: {
        token: admin.getJwtToken(),
        id: accessRequest.id,
        permission: DocumentPermission.ReadWrite,
      },
    });

    expect(res.status).toEqual(400);
  });
});
