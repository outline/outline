import crypto from "crypto";
import env from "@server/env";

/**
 * Helper class for working with subscription settings
 */
export default class SubscriptionHelper {
  /**
   * Get the unsubscribe URL for a user and document. This url allows the user
   * to unsubscribe from a specific document without being signed in, for one-click
   * links in emails.
   *
   * @param userId The user ID to unsubscribe
   * @param documentId The document ID to unsubscribe from
   * @returns The unsubscribe URL
   */
  public static unsubscribeUrl(userId: string, documentId: string) {
    return `${env.URL}/api/subscriptions.delete?token=${this.unsubscribeToken(
      userId,
      documentId
    )}&userId=${userId}&documentId=${documentId}`;
  }

  public static unsubscribeToken(userId: string, documentId: string) {
    const hash = crypto.createHash("sha256");
    hash.update(`${userId}-${env.SECRET_KEY}-${documentId}`);
    return hash.digest("hex");
  }
}
