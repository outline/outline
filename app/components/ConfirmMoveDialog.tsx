import { observer } from "mobx-react";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CollectionPermission, NavigationNode } from "@shared/types";
import type Collection from "~/models/Collection";
import ConfirmationDialog from "~/components/ConfirmationDialog";
import useStores from "~/hooks/useStores";
import { AuthorizationError } from "~/utils/errors";

type Props = {
  /** The navigation node to move, must represent a document. */
  item: NavigationNode;
  /** The collection to move the document to. */
  collection: Collection;
  /** The parent document to move the document under. */
  parentDocumentId?: string | null;
  /** The index to move the document to. */
  index?: number | null;
};

function ConfirmMoveDialog({ collection, item, ...rest }: Props) {
  const { documents, dialogs, collections } = useStores();
  const { t } = useTranslation();
  const prevCollection = collections.get(item.collectionId!);
  const accessMapping: Record<Partial<CollectionPermission> | "null", string> =
    {
      [CollectionPermission.Admin]: t("manage access"),
      [CollectionPermission.ReadWrite]: t("view and edit access"),
      [CollectionPermission.Read]: t("view only access"),
      null: t("no access"),
    };

  const handleSubmit = async () => {
    try {
      await documents.move({
        documentId: item.id,
        collectionId: collection.id,
        ...rest,
      });
    } catch (err) {
      if (err instanceof AuthorizationError) {
        toast.error(
          t(
            "You do not have permission to move {{ documentName }} to the {{ collectionName }} collection",
            {
              documentName: item.title,
              collectionName: collection.name,
            }
          )
        );
      } else {
        toast.error(err.message);
      }
    } finally {
      dialogs.closeAllModals();
    }
  };

  return (
    <ConfirmationDialog
      onSubmit={handleSubmit}
      submitText={t("Move document")}
      savingText={`${t("Moving")}…`}
    >
      <Trans
        defaults="Moving the document <em>{{ title }}</em> to the {{ newCollectionName }} collection will change permission for all workspace members from <em>{{ prevPermission }}</em> to <em>{{ newPermission }}</em>."
        values={{
          title: item.title,
          prevCollectionName: prevCollection?.name,
          newCollectionName: collection.name,
          prevPermission: accessMapping[prevCollection?.permission || "null"],
          newPermission: accessMapping[collection.permission || "null"],
        }}
        components={{
          em: <strong />,
        }}
      />
    </ConfirmationDialog>
  );
}

export default observer(ConfirmMoveDialog);
