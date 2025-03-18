import { observer } from "mobx-react";
import { CopyIcon, EditIcon, TrashIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import { useMenuState } from "reakit/Menu";
import Template from "~/models/Template";
import ContextMenu from "~/components/ContextMenu";
import OverflowMenuButton from "~/components/ContextMenu/OverflowMenuButton";
import ContextMenuTemplate from "~/components/ContextMenu/Template";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";

type Props = {
  template: Template;
};

function TemplateMenu({ template }: Props) {
  const menu = useMenuState({
    modal: true,
  });
  const { templates } = useStores();
  const { t } = useTranslation();
  const history = useHistory();
  const can = usePolicy(template);

  return (
    <>
      <OverflowMenuButton aria-label={t("Show menu")} {...menu} />
      <ContextMenu {...menu} aria-label={t("Template options")}>
        <ContextMenuTemplate
          {...menu}
          items={[
            {
              type: "button",
              title: t("Edit"),
              visible: !!can.update,
              icon: <EditIcon />,
              onClick: () => history.push(`/settings/templates/${template.id}`),
            },
            {
              type: "button",
              title: t("Duplicate"),
              visible: !!can.duplicate,
              icon: <CopyIcon />,
              onClick: () => templates.duplicate(template),
            },
            {
              type: "separator",
            },
            {
              type: "button",
              title: t("Delete"),
              visible: !!can.delete,
              icon: <TrashIcon />,
              dangerous: true,
              onClick: () => templates.delete(template),
            },
          ]}
        />
      </ContextMenu>
    </>
  );
}

export default observer(TemplateMenu);
