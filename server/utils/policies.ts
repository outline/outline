import { Document, User } from "@server/models";
import { authorize } from "@server/policies";

/**
 * Check if the given user can access a document
 *
 * @param user - The user to check
 * @param documentId - The document to check
 * @returns Boolean whether the user can access the document
 */
export const canUserAccessDocument = async (user: User, documentId: string) => {
  try {
    const document = await Document.findByPk(documentId, {
      userId: user.id,
    });
    authorize(user, "read", document);
    return true;
  } catch (err) {
    return false;
  }
};
