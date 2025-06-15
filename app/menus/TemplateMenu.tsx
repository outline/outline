import { observer } from "mobx-react";
import { DuplicateIcon, EditIcon } from "outline-icons";
import { useTranslation } from "react-i18next";
import Template from "~/models/Template";
import ContextMenu from "~/components/ContextMenu";
import OverflowMenuButton from "~/components/ContextMenu/OverflowMenuButton";
import ContextMenuTemplate from "~/components/ContextMenu/Template";
import { actionToMenuItem } from "~/actions";
import { deleteTemplate, moveTemplate } from "~/actions/definitions/templates";
import useActionContext from "~/hooks/useActionContext";
import { useMenuState } from "~/hooks/useMenuState";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";

type Props = {
  template: Template;
  onEdit?: () => void;
};

function TemplateMenu({ template, onEdit }: Props) {
  const menu = useMenuState({
    modal: true,
  });
  const { templates } = useStores();
  const { t } = useTranslation();
  const can = usePolicy(template);
  const context = useActionContext({
    isContextMenu: true,
    activeTemplateId: template.id,
  });

  return (
    <>
      <OverflowMenuButton aria-label={t("Show menu")} {...menu} />
      <ContextMenu {...menu} aria-label={t("Template options")}>
        <ContextMenuTemplate
          {...menu}
          items={[
            {
              type: "button",
              title: `${t("Edit")}…`,
              visible: !!can.update,
              icon: <EditIcon />,
              onClick: () => onEdit?.(),
            },
            {
              type: "button",
              title: t("Duplicate"),
              visible: !!can.duplicate,
              icon: <DuplicateIcon />,
              onClick: () => templates.duplicate(template),
            },
            actionToMenuItem(moveTemplate, context),
            {
              type: "separator",
            },
            actionToMenuItem(deleteTemplate, context),
          ]}
        />
      </ContextMenu>
    </>
  );
}

export default observer(TemplateMenu);
