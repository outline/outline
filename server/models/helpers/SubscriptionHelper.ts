import crypto from "crypto";
import queryString from "query-string";
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
    const token = this.unsubscribeToken(userId, documentId);

    return `${env.URL}/api/subscriptions.delete?${queryString.stringify({
      token,
      userId,
      documentId,
    })}`;
  }

  /**
   * Generate a token for unsubscribing a user from a document or collection.
   *
   * @param userId The user ID to unsubscribe
   * @param documentId The document ID to unsubscribe from
   * @returns The unsubscribe token
   */
  public static unsubscribeToken(userId: string, documentId: string) {
    const hash = crypto.createHash("sha256");
    hash.update(`${userId}-${env.SECRET_KEY}-${documentId}`);
    return hash.digest("hex");
  }
}
