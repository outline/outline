// @flow
import { observer } from "mobx-react";
import { PlusIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useMenuState, MenuButton } from "reakit/Menu";
import Button from "components/Button";
import CollectionIcon from "components/CollectionIcon";
import ContextMenu from "components/ContextMenu";
import Header from "components/ContextMenu/Header";
import Template from "components/ContextMenu/Template";
import useStores from "hooks/useStores";
import { newDocumentUrl } from "utils/routeHelpers";

function NewTemplateMenu() {
  const menu = useMenuState({ animated: 200, modal: true });
  const { t } = useTranslation();
  const { collections, policies } = useStores();

  return (
    <>
      <MenuButton {...menu}>
        {(props) => (
          <Button icon={<PlusIcon />} {...props} small>
            {t("New template")}…
          </Button>
        )}
      </MenuButton>
      <ContextMenu aria-label={t("New template")} {...menu}>
        <Header>{t("Choose a collection")}</Header>
        <Template
          {...menu}
          items={collections.orderedData.map((collection) => ({
            to: newDocumentUrl(collection.id, {
              template: true,
            }),
            disabled: !policies.abilities(collection.id).update,
            title: (
              <>
                <CollectionIcon collection={collection} />
                &nbsp;{collection.name}
              </>
            ),
          }))}
        />
      </ContextMenu>
    </>
  );
}

export default observer(NewTemplateMenu);
