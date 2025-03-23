import { v4 as uuidv4 } from "uuid";
import env from "@server/env";
import SubscriptionHelper from "./SubscriptionHelper";

describe("SubscriptionHelper", () => {
  describe("unsubscribeUrl", () => {
    it("should return a valid unsubscribe URL", () => {
      const userId = uuidv4();
      const documentId = uuidv4();

      const unsubscribeUrl = SubscriptionHelper.unsubscribeUrl(
        userId,
        documentId
      );
      expect(unsubscribeUrl).toContain(`${env.URL}/api/subscriptions.delete`);
      expect(unsubscribeUrl).toContain(`userId=${userId}`);
      expect(unsubscribeUrl).toContain(`documentId=${documentId}`);
    });
  });
});
