import { observer } from "mobx-react";
import * as React from "react";
import { DuplicateIcon, EditIcon } from "outline-icons";
import { useTranslation } from "react-i18next";
import Template from "~/models/Template";
import { OverflowMenuButton } from "~/components/Menu/OverflowMenuButton";
import { ActionV2Separator, createActionV2 } from "~/actions";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { useMenuAction } from "~/hooks/useMenuAction";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import { deleteTemplate, moveTemplate } from "~/actions/definitions/templates";
import { ActionContextProvider } from "~/hooks/useActionContext";

type Props = {
  template: Template;
  onEdit?: () => void;
};

function TemplateMenu({ template, onEdit }: Props) {
  const { t } = useTranslation();
  const { templates } = useStores();
  const can = usePolicy(template);

  const section = "Template";
  const actions = React.useMemo(
    () => [
      createActionV2({
        name: `${t("Edit")}…`,
        visible: !!can.update,
        icon: <EditIcon />,
        section,
        perform: () => onEdit?.(),
      }),
      createActionV2({
        name: t("Duplicate"),
        visible: !!can.duplicate,
        icon: <DuplicateIcon />,
        section,
        perform: () => templates.duplicate(template),
      }),
      moveTemplate,
      ActionV2Separator,
      deleteTemplate,
    ],
    [can.update, can.duplicate, onEdit]
  );
  const rootAction = useMenuAction(actions);

  return (
    <ActionContextProvider value={{ activeTemplateId: template.id }}>
      <DropdownMenu
        action={rootAction}
        align="end"
        ariaLabel={t("Template options")}
      >
        <OverflowMenuButton />
      </DropdownMenu>
    </ActionContextProvider>
  );
}

export default observer(TemplateMenu);
