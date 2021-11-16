import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation, Trans } from "react-i18next";
import { useMenuState, MenuButton } from "reakit/Menu";
import Document from "models/Document";
import ContextMenu from "components/ContextMenu";
import Template from "components/ContextMenu/Template";
import useStores from "hooks/useStores";
// @ts-expect-error ts-migrate(2307) FIXME: Cannot find module 'utils/routeHelpers' or its cor... Remove this comment to see the full error message
import { newDocumentPath } from "utils/routeHelpers";

type Props = {
  label?: (arg0: any) => React.ReactNode;
  document: Document;
};

function NewChildDocumentMenu({ document, label }: Props) {
  const menu = useMenuState({
    modal: true,
  });
  const { collections } = useStores();
  const { t } = useTranslation();
  const collection = collections.get(document.collectionId);
  const collectionName = collection ? collection.name : t("collection");
  return (
    <>
      <MenuButton {...menu}>{label}</MenuButton>
      // @ts-expect-error ts-migrate(2322) FIXME: Type '{ children: Element; "aria-label": string; b... Remove this comment to see the full error message
      <ContextMenu {...menu} aria-label={t("New child document")}>
        // @ts-expect-error ts-migrate(2741) FIXME: Property 'actions' is missing in type '{ items: ({... Remove this comment to see the full error message
        <Template
          {...menu}
          items={[
            {
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
            },
            {
              title: t("New nested document"),
              to: newDocumentPath(document.collectionId, {
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
