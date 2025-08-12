import { NotFoundError, PaymentRequiredError } from "@server/errors";
import { Document, User } from "@server/models";
import { authorize } from "@server/policies";

type Props = {
  id: string;
  user: User;
  includeState?: boolean;
};

export default async function loadDocument({
  id,
  user,
  includeState,
}: Props): Promise<Document> {
  const document = await Document.findByPk(id, {
    userId: user ? user.id : undefined,
    paranoid: false,
    includeState,
  });

  if (!document) {
    throw NotFoundError();
  }

  if (document.deletedAt) {
    // don't send data if user cannot restore deleted doc
    if (user) {
      authorize(user, "restore", document);
    }
  } else {
    if (user) {
      authorize(user, "read", document);
    }
  }

  if (document.isTrialImport) {
    throw PaymentRequiredError();
  }

  return document;
}
