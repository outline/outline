import { ChangeRequestStatus } from "@shared/types";
import { buildChangeRequest, buildCollection } from "@server/test/factories";

describe("ChangeRequest", () => {
  it("should create a change request with default draft status", async () => {
    const changeRequest = await buildChangeRequest();
    expect(changeRequest.status).toEqual(ChangeRequestStatus.Draft);
    expect(changeRequest.draftDocumentId).toBeTruthy();
    expect(changeRequest.documentId).toBeNull();
    expect(changeRequest.proposedChanges).toBeNull();
  });

  it("should persist approval settings on a collection", async () => {
    const collection = await buildCollection({
      maintainerApprovalRequired: true,
    });
    await collection.reload();
    expect(collection.maintainerApprovalRequired).toBe(true);
  });
});
