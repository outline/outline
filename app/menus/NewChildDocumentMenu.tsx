import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import Document from "~/models/Document";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { newDocumentPath, newNestedDocumentPath } from "~/utils/routeHelpers";
import { createInternalLinkActionV2 } from "~/actions";
import { ActiveDocumentSection } from "~/actions/sections";
import { useMenuAction } from "~/hooks/useMenuAction";
import Tooltip from "~/components/Tooltip";
import Button from "~/components/Button";
import { PlusIcon } from "outline-icons";

type Props = {
  document: Document;
};

function NewChildDocumentMenu({ document }: Props) {
  const { t } = useTranslation();
  const canCollection = usePolicy(document.collectionId);
  const { collections } = useStores();

  const collection = document.collectionId
    ? collections.get(document.collectionId)
    : undefined;
  const collectionName = collection ? collection.name : t("collection");

  const actions = React.useMemo(
    () => [
      createInternalLinkActionV2({
        name: (
          <Trans
            defaults="New document in <em>{{ collectionName }}</em>"
            values={{
              collectionName,
            }}
            components={{
              em: <strong />,
            }}
          />
        ),
        section: ActiveDocumentSection,
        visible: !!canCollection.createDocument,
        to: newDocumentPath(document.collectionId),
      }),
      createInternalLinkActionV2({
        name: (
          <Trans
            defaults="New document in <em>{{ collectionName }}</em>"
            values={{
              collectionName: document.titleWithDefault,
            }}
            components={{
              em: <strong />,
            }}
          />
        ),
        section: ActiveDocumentSection,
        visible: true,
        to: newNestedDocumentPath(document.id),
      }),
    ],
    [
      collectionName,
      canCollection.createDocument,
      document.id,
      document.titleWithDefault,
      document.collectionId,
    ]
  );

  const rootAction = useMenuAction(actions);

  return (
    <Tooltip content={t("New document")} shortcut="n" placement="bottom">
      <DropdownMenu
        action={rootAction}
        align="end"
        ariaLabel={t("New child document")}
      >
        <Button icon={<PlusIcon />} neutral>
          {t("New doc")}
        </Button>
      </DropdownMenu>
    </Tooltip>
  );
}

export default observer(NewChildDocumentMenu);
