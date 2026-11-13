import { addDays, subDays } from "date-fns";
import { Share } from "@server/models";
import { buildShare } from "@server/test/factories";

describe("Share", () => {
  describe("getPublicSharesForDocumentIds", () => {
    it("should return shares without an expiry or with a future expiry", async () => {
      const noExpiry = await buildShare();
      const future = await buildShare({
        teamId: noExpiry.teamId,
        expiresAt: addDays(new Date(), 1),
      });

      const shares = await Share.getPublicSharesForDocumentIds(
        noExpiry.teamId,
        [noExpiry.documentId!, future.documentId!]
      );

      expect(shares.map((share) => share.id).sort()).toEqual(
        [noExpiry.id, future.id].sort()
      );
    });

    it("should not return expired shares", async () => {
      const share = await buildShare({
        expiresAt: subDays(new Date(), 1),
      });

      const shares = await Share.getPublicSharesForDocumentIds(
        share.teamId,
        share.documentId!
      );

      expect(shares).toEqual([]);
    });
  });
});
