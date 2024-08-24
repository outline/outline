import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { useMenuState, MenuButton, MenuButtonHTMLProps } from "reakit/Menu";
import Document from "~/models/Document";
import ContextMenu from "~/components/ContextMenu";
import Template from "~/components/ContextMenu/Template";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { MenuItem } from "~/types";
import { newDocumentPath, newNestedDocumentPath } from "~/utils/routeHelpers";

type Props = {
  label?: (props: MenuButtonHTMLProps) => React.ReactNode;
  document: Document;
};

function NewChildDocumentMenu({ document, label }: Props) {
  const menu = useMenuState({
    modal: true,
  });
  const { t } = useTranslation();
  const canCollection = usePolicy(document.collectionId);
  const { collections } = useStores();

  const items: MenuItem[] = [];

  if (canCollection.createDocument) {
    const collection = document.collectionId
      ? collections.get(document.collectionId)
      : undefined;
    const collectionName = collection ? collection.name : t("collection");
    items.push({
      type: "route",
      title: (
        <span>
          <Trans
            defaults="New document in <em>{{ collectionName }}</em>"
            values={{
              collectionName,
            }}
            components={{
              em: <strong />,
            }}
          />
        </span>
      ),
      to: newDocumentPath(document.collectionId),
    });
  }

  items.push({
    type: "route",
    title: (
      <span>
        <Trans
          defaults="New document in <em>{{ collectionName }}</em>"
          values={{
            collectionName: document.title,
          }}
          components={{
            em: <strong />,
          }}
        />
      </span>
    ),
    to: newNestedDocumentPath(document.id),
  });

  return (
    <>
      <MenuButton {...menu}>{label}</MenuButton>
      <ContextMenu {...menu} aria-label={t("New child document")}>
        <Template {...menu} items={items} />
      </ContextMenu>
    </>
  );
}

export default observer(NewChildDocumentMenu);
