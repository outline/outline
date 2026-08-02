import { NotFoundError, PaymentRequiredError } from "@server/errors";
import type { User } from "@server/models";
import { Document } from "@server/models";
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

  // Documents that have left the trash are pending permanent deletion, they are
  // treated as if they no longer exist.
  if (document.isDestroyed) {
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
