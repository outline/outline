import { ChangeRequestStatus } from "@shared/types";
import {
  buildAdmin,
  buildChangeRequest,
  buildCollection,
  buildCollectionMaintainer,
  buildDraftDocument,
  buildUser,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";
import { ChangeRequest, Document } from "@server/models";
import { serialize } from "@server/policies";

const server = getTestServer();

async function buildApprovalCollection(userId: string, teamId: string) {
  const collection = await buildCollection({
    teamId,
    userId,
    maintainerApprovalRequired: true,
  });
  return collection;
}

describe("#changeRequests.submit", () => {
  it("should require authentication", async () => {
    const res = await server.post("/api/changeRequests.submit");
    expect(res.status).toEqual(401);
  });

  it("should submit a draft for review", async () => {
    const user = await buildUser();
    const collection = await buildApprovalCollection(user.id, user.teamId);
    const draft = await buildDraftDocument({
      userId: user.id,
      teamId: user.teamId,
      collectionId: collection.id,
    });

    const res = await server.post("/api/changeRequests.submit", user, {
      body: {
        draftDocumentId: draft.id,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.status).toEqual(ChangeRequestStatus.Submitted);
    expect(body.data.draftDocumentId).toEqual(draft.id);
    expect(body.data.submittedById).toEqual(user.id);
  });

  it("should reject submit when approval is not required", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      userId: user.id,
      teamId: user.teamId,
    });
    const draft = await buildDraftDocument({
      userId: user.id,
      teamId: user.teamId,
      collectionId: collection.id,
    });

    const res = await server.post("/api/changeRequests.submit", user, {
      body: {
        draftDocumentId: draft.id,
      },
    });

    expect(res.status).toEqual(400);
  });
});

describe("#changeRequests.approve", () => {
  it("should approve and publish a submitted draft", async () => {
    const author = await buildUser();
    const maintainer = await buildUser({ teamId: author.teamId });
    const collection = await buildApprovalCollection(author.id, author.teamId);
    await buildCollectionMaintainer({
      collectionId: collection.id,
      userId: maintainer.id,
    });
    const draft = await buildDraftDocument({
      userId: author.id,
      teamId: author.teamId,
      collectionId: collection.id,
    });

    const submitRes = await server.post("/api/changeRequests.submit", author, {
      body: {
        draftDocumentId: draft.id,
      },
    });
    const submitBody = await submitRes.json();

    const res = await server.post("/api/changeRequests.approve", maintainer, {
      body: {
        id: submitBody.data.id,
      },
    });
    const body = await res.json();
    const document = await Document.findByPk(draft.id, {
      userId: maintainer.id,
    });

    expect(res.status).toEqual(200);
    expect(body.data.status).toEqual(ChangeRequestStatus.Approved);
    expect(body.data.documentId).toEqual(draft.id);
    expect(document?.publishedAt).toBeTruthy();
  });

  it("should not allow authors to approve their own submission", async () => {
    const author = await buildUser();
    const collection = await buildApprovalCollection(author.id, author.teamId);
    const draft = await buildDraftDocument({
      userId: author.id,
      teamId: author.teamId,
      collectionId: collection.id,
    });
    const changeRequest = await buildChangeRequest({
      userId: author.id,
      collectionId: collection.id,
      status: ChangeRequestStatus.Submitted,
      submittedById: author.id,
      submittedAt: new Date(),
      draftDocumentId: draft.id,
    });

    const res = await server.post("/api/changeRequests.approve", author, {
      body: {
        id: changeRequest.id,
      },
    });

    expect(res.status).toEqual(403);
  });
});

describe("#changeRequests.reject", () => {
  it("should allow maintainers to reject a submission", async () => {
    const author = await buildUser();
    const maintainer = await buildUser({ teamId: author.teamId });
    const collection = await buildApprovalCollection(author.id, author.teamId);
    await buildCollectionMaintainer({
      collectionId: collection.id,
      userId: maintainer.id,
    });
    const draft = await buildDraftDocument({
      userId: author.id,
      teamId: author.teamId,
      collectionId: collection.id,
    });

    const submitRes = await server.post("/api/changeRequests.submit", author, {
      body: {
        draftDocumentId: draft.id,
      },
    });
    const submitBody = await submitRes.json();

    const res = await server.post("/api/changeRequests.reject", maintainer, {
      body: {
        id: submitBody.data.id,
        reviewNote: "Needs more detail",
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.status).toEqual(ChangeRequestStatus.Rejected);
    expect(body.data.reviewNote).toEqual("Needs more detail");
  });
});

describe("#changeRequests.withdraw", () => {
  it("should allow authors to withdraw their submission", async () => {
    const author = await buildUser();
    const collection = await buildApprovalCollection(author.id, author.teamId);
    const draft = await buildDraftDocument({
      userId: author.id,
      teamId: author.teamId,
      collectionId: collection.id,
    });

    const submitRes = await server.post("/api/changeRequests.submit", author, {
      body: {
        draftDocumentId: draft.id,
      },
    });
    const submitBody = await submitRes.json();

    const res = await server.post("/api/changeRequests.withdraw", author, {
      body: {
        id: submitBody.data.id,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.status).toEqual(ChangeRequestStatus.Withdrawn);
  });
});

describe("#changeRequests.list", () => {
  it("should list submitted change requests for maintainers", async () => {
    const author = await buildUser();
    const maintainer = await buildUser({ teamId: author.teamId });
    const collection = await buildApprovalCollection(author.id, author.teamId);
    await buildCollectionMaintainer({
      collectionId: collection.id,
      userId: maintainer.id,
    });
    const draft = await buildDraftDocument({
      userId: author.id,
      teamId: author.teamId,
      collectionId: collection.id,
    });

    await server.post("/api/changeRequests.submit", author, {
      body: {
        draftDocumentId: draft.id,
      },
    });

    const res = await server.post("/api/changeRequests.list", maintainer, {
      body: {
        status: ChangeRequestStatus.Submitted,
      },
    });
    const body = await res.json();

    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.policies[0].abilities.approve).toBeTruthy();
  });
});

describe("change request policies", () => {
  it("should deny publish when collection requires approval", async () => {
    const user = await buildUser();
    const collection = await buildCollection({
      userId: user.id,
      teamId: user.teamId,
      maintainerApprovalRequired: true,
    });
    const draft = await buildDraftDocument({
      userId: user.id,
      teamId: user.teamId,
      collectionId: collection.id,
    });
    const document = await Document.scope("withDrafts").findByPk(draft.id, {
      userId: user.id,
    });
    const abilities = serialize(user, document);

    expect(abilities.publish).toEqual(false);
  });

  it("should allow team admins to approve submitted change requests", async () => {
    const admin = await buildAdmin();
    const author = await buildUser({ teamId: admin.teamId });
    const collection = await buildApprovalCollection(author.id, author.teamId);
    const draft = await buildDraftDocument({
      userId: author.id,
      teamId: author.teamId,
      collectionId: collection.id,
    });

    const submitRes = await server.post("/api/changeRequests.submit", author, {
      body: {
        draftDocumentId: draft.id,
      },
    });
    const submitBody = await submitRes.json();
    const changeRequest = await ChangeRequest.findByPk(submitBody.data.id);

    const abilities = serialize(admin, changeRequest);

    expect(abilities.approve).toBeTruthy();
    expect(abilities.reject).toBeTruthy();
  });
});

describe("direct publish gate", () => {
  it("should reject direct publish when approval is required", async () => {
    const user = await buildUser();
    const collection = await buildApprovalCollection(user.id, user.teamId);
    const draft = await buildDraftDocument({
      userId: user.id,
      teamId: user.teamId,
      collectionId: collection.id,
    });

    const res = await server.post("/api/documents.update", user, {
      body: {
        id: draft.id,
        publish: true,
      },
    });

    expect(res.status).toEqual(403);
  });
});
