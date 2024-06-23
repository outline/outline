import { observer } from "mobx-react";
import { DocumentIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { MenuButton, useMenuState } from "reakit/Menu";
import Document from "~/models/Document";
import Button from "~/components/Button";
import ContextMenu from "~/components/ContextMenu";
import MenuItem from "~/components/ContextMenu/MenuItem";
import Separator from "~/components/ContextMenu/Separator";
import Icon from "~/components/Icon";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";
import { replaceTitleVariables } from "~/utils/date";

type Props = {
  document: Document;
  onSelectTemplate: (template: Document) => void;
};

function TemplatesMenu({ onSelectTemplate, document }: Props) {
  const menu = useMenuState({
    modal: true,
  });
  const user = useCurrentUser();
  const { documents } = useStores();
  const { t } = useTranslation();
  const templates = documents.templates;

  if (!templates.length) {
    return null;
  }

  const templatesInCollection = templates.filter(
    (t) => t.collectionId === document.collectionId
  );
  const otherTemplates = templates.filter(
    (t) => t.collectionId !== document.collectionId
  );

  const renderTemplate = (template: Document) => (
    <MenuItem
      key={template.id}
      onClick={() => onSelectTemplate(template)}
      icon={
        template.icon ? (
          <Icon value={template.icon} color={template.color ?? undefined} />
        ) : (
          <DocumentIcon />
        )
      }
      {...menu}
    >
      {replaceTitleVariables(template.titleWithDefault, user)}
    </MenuItem>
  );

  return (
    <>
      <MenuButton {...menu}>
        {(props) => (
          <Button {...props} disclosure neutral>
            {t("Templates")}
          </Button>
        )}
      </MenuButton>
      <ContextMenu {...menu} aria-label={t("Templates")}>
        {templatesInCollection.map(renderTemplate)}
        {otherTemplates.length && templatesInCollection.length ? (
          <Separator />
        ) : undefined}
        {otherTemplates.map(renderTemplate)}
      </ContextMenu>
    </>
  );
}

export default observer(TemplatesMenu);
