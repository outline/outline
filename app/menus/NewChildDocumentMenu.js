// @flow
import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { useMenuState, MenuButton } from "reakit/Menu";
import Document from "models/Document";
import ContextMenu from "components/ContextMenu";
import Template from "components/ContextMenu/Template";
import useStores from "hooks/useStores";
import { newDocumentUrl } from "utils/routeHelpers";

type Props = {
  label?: (any) => React.Node,
  document: Document,
};

function NewChildDocumentMenu({ document, label }: Props) {
  const menu = useMenuState({ modal: true });
  const { collections } = useStores();
  const { t } = useTranslation();
  const collection = collections.get(document.collectionId);
  const collectionName = collection ? collection.name : t("collection");

  return (
    <>
      <MenuButton {...menu}>{label}</MenuButton>
      <ContextMenu {...menu} aria-label={t("New child document")}>
        <Template
          {...menu}
          items={[
            {
              title: (
                <span>
                  <Trans
                    defaults="New document in <em>{{ collectionName }}</em>"
                    values={{ collectionName }}
                    components={{ em: <strong /> }}
                  />
                </span>
              ),
              to: newDocumentUrl(document.collectionId),
            },
            {
              title: t("New nested document"),
              to: newDocumentUrl(document.collectionId, {
                parentDocumentId: document.id,
              }),
            },
          ]}
        />
      </ContextMenu>
    </>
  );
}

export default observer(NewChildDocumentMenu);
