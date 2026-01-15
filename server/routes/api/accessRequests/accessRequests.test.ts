import { DocumentPermission } from "@shared/types";
import { AccessRequest, Event, UserMembership } from "@server/models";
import { AccessRequestStatus } from "@server/models/AccessRequest";
import {
  buildAdmin,
  buildDocument,
  buildTeam,
  buildUser,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

describe("#accessRequests.create", () => {
  it("should require id", async () => {
    const user = await buildUser();
    const res = await server.post("/api/accessRequests.create", {
      body: {
        token: user.getJwtToken(),
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toEqual("documentId: Must be a valid UUID or slug");
  });

  it("should require authentication", async () => {
    const document = await buildDocument();
    const res = await server.post("/api/accessRequests.create", {
      body: {
        documentId: document.id,
      },
    });
    expect(res.status).toEqual(401);
  });

  it("should return 404 for non-existent document", async () => {
    const user = await buildUser();
    const res = await server.post("/api/accessRequests.create", {
      body: {
        token: user.getJwtToken(),
        documentId: "a8f22c38-f4eb-4909-8c30-b927af36c5f3",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(404);
    expect(body.message).toEqual("Document could not be found");
  });

  it("should create event when requesting access to a document", async () => {
    const team = await buildTeam();
    const owner = await buildUser({ teamId: team.id });
    const requester = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      teamId: team.id,
      createdById: owner.id,
    });

    const res = await server.post("/api/accessRequests.create", {
      body: {
        token: requester.getJwtToken(),
        documentId: document.id,
      },
    });

    expect(res.status).toEqual(200);
    const events = await Event.findAll({
      where: {
        teamId: team.id,
        name: "documents.request_access",
      },
    });
    expect(events.length).toEqual(1);
    expect(events[0].documentId).toEqual(document.id);
    expect(events[0].actorId).toEqual(requester.id);
  });

  it("should work with document urlId", async () => {
    const team = await buildTeam();
    const owner = await buildUser({ teamId: team.id });
    const requester = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      teamId: team.id,
      createdById: owner.id,
    });

    const res = await server.post("/api/accessRequests.create", {
      body: {
        token: requester.getJwtToken(),
        documentId: document.urlId,
      },
    });
    expect(res.status).toEqual(200);
  });

  it("should not allow new request if pending exists", async () => {
    const team = await buildTeam();
    const requester = await buildUser({ teamId: team.id });
    const admin = await buildAdmin({ teamId: team.id });
    const document = await buildDocument({
      createdById: admin.id,
      teamId: team.id,
    });

    // Create first access request
    const res1 = await server.post("/api/accessRequests.create", {
      body: {
        token: requester.getJwtToken(),
        documentId: document.id,
      },
    });

    // Try to create another
    const res2 = await server.post("/api/accessRequests.create", {
      body: {
        token: requester.getJwtToken(),
        documentId: document.id,
      },
    });

    expect(res1.status).toEqual(200);
    expect(res2.status).toEqual(400);

    // Verify only one access request exists
    const count = await AccessRequest.count({
      where: {
        documentId: document.id,
        userId: requester.id,
      },
    });
    expect(count).toEqual(1);
  });

  it("should allow creating new request after previous was dismissed", async () => {
    const team = await buildTeam();
    const requester = await buildUser({ teamId: team.id });
    const admin = await buildAdmin({ teamId: team.id });
    const document = await buildDocument({
      createdById: admin.id,
      teamId: team.id,
    });

    // Create and dismiss first request
    const res1 = await AccessRequest.create({
      documentId: document.id,
      userId: requester.id,
      teamId: team.id,
      status: AccessRequestStatus.Dismissed,
      responderId: admin.id,
      respondedAt: new Date(),
    });

    // Create new request
    const res2 = await server.post("/api/accessRequests.create", {
      body: {
        token: requester.getJwtToken(),
        documentId: document.id,
      },
    });
    const body = await res2.json();

    expect(res2.status).toEqual(200);
    expect(body.data.id).not.toEqual(res1.id);
    expect(body.data.status).toEqual(AccessRequestStatus.Pending);
  });
});

describe("#accessRequests.info", () => {
  it("should require authentication", async () => {
    const res = await server.post("/api/accessRequests.info");
    expect(res.status).toEqual(401);
  });

  it("should fail if both id and documentId are missing", async () => {
    const user = await buildUser();
    const res = await server.post("/api/accessRequests.info", {
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

    const res = await server.post("/api/accessRequests.info", {
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

  it("should return access request correctly by documentId", async () => {
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

    const res = await server.post("/api/accessRequests.info", {
      body: {
        token: requester.getJwtToken(),
        documentId: document.urlId,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.id).toEqual(accessRequest.id);
    expect(body.data.status).toEqual(AccessRequestStatus.Pending);
  });

  it("should return 404 if access request not found", async () => {
    const user = await buildUser();
    const res = await server.post("/api/accessRequests.info", {
      body: {
        token: user.getJwtToken(),
        id: "00000000-0000-0000-0000-000000000000",
      },
    });
    expect(res.status).toEqual(404);
  });
});

describe("#accessRequests.approve", () => {
  it("should require authentication", async () => {
    const res = await server.post("/api/accessRequests.approve");
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
      status: AccessRequestStatus.Pending,
    });

    const res = await server.post("/api/accessRequests.approve", {
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

    const res = await server.post("/api/accessRequests.approve", {
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

    const res = await server.post("/api/accessRequests.approve", {
      body: {
        token: admin.getJwtToken(),
        id: accessRequest.id,
        permission: DocumentPermission.ReadWrite,
      },
    });

    expect(res.status).toEqual(400);
  });
});

describe("#accessRequests.dismiss", () => {
  it("should require authentication", async () => {
    const res = await server.post("/api/accessRequests.dismiss");
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

    const res = await server.post("/api/accessRequests.dismiss", {
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

    const res = await server.post("/api/accessRequests.dismiss", {
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

    const res = await server.post("/api/accessRequests.dismiss", {
      body: {
        token: admin.getJwtToken(),
        id: accessRequest.id,
      },
    });

    expect(res.status).toEqual(400);
  });
});
