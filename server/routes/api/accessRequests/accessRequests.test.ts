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
      userId: admin.id,
      teamId: team.id,
    });

    // Create document admin membership
    await UserMembership.create({
      userId: admin.id,
      documentId: document.id,
      createdById: admin.id,
      permission: DocumentPermission.Admin,
    });

    // Create access request
    const accessRequest = await AccessRequest.create({
      documentId: document.id,
      userId: requester.id,
      teamId: team.id,
      status: AccessRequestStatus.Pending,
    });

    const res = await server.post("/api/access_requests.approve", {
      body: {
        token: admin.getJwtToken(),
        id: accessRequest.id,
        permission: DocumentPermission.ReadWrite,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.status).toEqual(AccessRequestStatus.Approved);
    expect(body.data.responderId).toEqual(admin.id);

    // Verify that the user now has access
    const membership = await UserMembership.findOne({
      where: {
        userId: requester.id,
        documentId: document.id,
      },
    });
    expect(membership).toBeTruthy();
    expect(membership?.permission).toEqual(DocumentPermission.ReadWrite);
  });

  it("should not allow non-admins to approve requests", async () => {
    const team = await buildTeam();
    const requester = await buildUser({ teamId: team.id });
    const admin = await buildAdmin({ teamId: team.id });
    const nonAdmin = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      userId: admin.id,
      teamId: team.id,
    });

    // Create document admin membership
    await UserMembership.create({
      userId: admin.id,
      documentId: document.id,
      createdById: admin.id,
      permission: DocumentPermission.Admin,
    });

    // Create access request
    const accessRequest = await AccessRequest.create({
      documentId: document.id,
      userId: requester.id,
      teamId: team.id,
      status: AccessRequestStatus.Pending,
    });

    const res = await server.post("/api/access_requests.approve", {
      body: {
        token: nonAdmin.getJwtToken(),
        id: accessRequest.id,
        permission: DocumentPermission.ReadWrite,
      },
    });

    expect(res.status).toEqual(403);
  });

  it("should not allow approving already responded requests", async () => {
    const team = await buildTeam();
    const requester = await buildUser({ teamId: team.id });
    const admin = await buildAdmin({ teamId: team.id });
    const document = await buildDocument({
      userId: admin.id,
      teamId: team.id,
    });

    // Create document admin membership
    await UserMembership.create({
      userId: admin.id,
      documentId: document.id,
      createdById: admin.id,
      permission: DocumentPermission.Admin,
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
      userId: admin.id,
      teamId: team.id,
    });

    // Create document admin membership
    await UserMembership.create({
      userId: admin.id,
      documentId: document.id,
      createdById: admin.id,
      permission: DocumentPermission.Admin,
    });

    // Create access request
    const accessRequest = await AccessRequest.create({
      documentId: document.id,
      userId: requester.id,
      teamId: team.id,
      status: AccessRequestStatus.Pending,
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

    // Verify that the user does not have access
    const membership = await UserMembership.findOne({
      where: {
        userId: requester.id,
        documentId: document.id,
      },
    });
    expect(membership).toBeNull();
  });

  it("should not allow non-admins to dismiss requests", async () => {
    const team = await buildTeam();
    const requester = await buildUser({ teamId: team.id });
    const admin = await buildAdmin({ teamId: team.id });
    const nonAdmin = await buildUser({ teamId: team.id });
    const document = await buildDocument({
      userId: admin.id,
      teamId: team.id,
    });

    // Create document admin membership
    await UserMembership.create({
      userId: admin.id,
      documentId: document.id,
      createdById: admin.id,
      permission: DocumentPermission.Admin,
    });

    // Create access request
    const accessRequest = await AccessRequest.create({
      documentId: document.id,
      userId: requester.id,
      teamId: team.id,
      status: AccessRequestStatus.Pending,
    });

    const res = await server.post("/api/access_requests.dismiss", {
      body: {
        token: nonAdmin.getJwtToken(),
        id: accessRequest.id,
      },
    });

    expect(res.status).toEqual(403);
  });
});
