import { Document, User } from "@server/models";
import { authorize } from "@server/policies";

export const canUserAccessDocument = async ({
  user,
  docId,
}: {
  user: User;
  docId: string;
}) => {
  try {
    const document = await Document.findByPk(docId, {
      userId: user.id,
    });
    authorize(user, "read", document);
    return true;
  } catch (err) {
    return false;
  }
};
