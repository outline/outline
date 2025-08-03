import {
  buildCollection,
  buildDocument,
  buildShare,
  buildUser,
} from "@server/test/factories";
import { Share } from "@server/models";

describe("Share", () => {
  describe("findWithParent", () => {
    it("should return only share when requested with collectionId", async () => {
      const user = await buildUser();
      const collection = await buildCollection({
        userId: user.id,
        teamId: user.teamId,
      });
      const share = await buildShare({
        userId: user.id,
        teamId: user.teamId,
        collectionId: collection.id,
      });

      const result = await Share.findWithParent({
        collectionId: collection.id,
        user,
      });

      expect(result.share.id).toEqual(share.id);
      expect(result.parentShare).toBeNull();
    });

    it("should return share and parentShare when requested with documentId", async () => {
      const user = await buildUser();
      const collection = await buildCollection({
        userId: user.id,
        teamId: user.teamId,
      });
      const document = await buildDocument({
        collectionId: collection.id,
        userId: user.id,
        teamId: user.teamId,
      });
      const childDocument = await buildDocument({
        parentDocumentId: document.id,
        collectionId: collection.id,
        userId: user.id,
        teamId: user.teamId,
      });
      const [parentShare, share] = await Promise.all([
        buildShare({
          includeChildDocuments: true,
          userId: user.id,
          teamId: user.teamId,
          documentId: document.id,
        }),
        buildShare({
          includeChildDocuments: false,
          userId: user.id,
          teamId: user.teamId,
          documentId: childDocument.id,
        }),
      ]);

      const result = await Share.findWithParent({
        documentId: childDocument.id,
        user,
      });

      expect(result.share.id).toEqual(share.id);
      expect(result.parentShare?.id).toEqual(parentShare.id);
    });
  });
});
