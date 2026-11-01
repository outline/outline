import { observer } from "mobx-react";
import { useTranslation } from "react-i18next";
import useCurrentUser from "~/hooks/useCurrentUser";
import useDocumentOwners from "~/hooks/useDocumentOwners";
import type Document from "~/models/Document";

type Props = {
  /** The document to describe the owners of. */
  document: Document;
};

/**
 * Describes who owns a document, renders nothing when it has no owners.
 */
function DocumentOwnersLabel({ document }: Props) {
  const { t } = useTranslation();
  const user = useCurrentUser({ rejectOnEmpty: false });
  const owners = useDocumentOwners(document);

  if (owners.length === 0) {
    return null;
  }

  const isOwner = !!user && owners.some((owner) => owner.id === user.id);
  const others = owners.filter((owner) => owner.id !== user?.id);
  let label: string;

  if (isOwner) {
    label =
      others.length === 0
        ? t("Owned by you")
        : others.length === 1
          ? t("Owned by you and {{ otherName }}", { otherName: others[0].name })
          : t("Owned by you and {{ count }} others", { count: others.length });
  } else {
    label =
      others.length === 1
        ? t("Owned by {{ name }}", { name: others[0].name })
        : others.length === 2
          ? t("Owned by {{ name }} and {{ otherName }}", {
              name: others[0].name,
              otherName: others[1].name,
            })
          : t("Owned by {{ name }} and {{ count }} others", {
              name: others[0].name,
              count: others.length - 1,
            });
  }

  return <span>{label}</span>;
}

export default observer(DocumentOwnersLabel);
