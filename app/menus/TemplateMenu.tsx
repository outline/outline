import { observer } from "mobx-react";
import * as React from "react";
import { DuplicateIcon, EditIcon } from "outline-icons";
import { useTranslation } from "react-i18next";
import type Template from "~/models/Template";
import { OverflowMenuButton } from "~/components/Menu/OverflowMenuButton";
import { ActionSeparator, createAction } from "~/actions";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { useMenuAction } from "~/hooks/useMenuAction";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import {
  copyTemplate,
  deleteTemplate,
  moveTemplate,
} from "~/actions/definitions/templates";
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
      createAction({
        name: `${t("Edit")}…`,
        visible: !!can.update && !!onEdit,
        icon: <EditIcon />,
        section,
        perform: () => onEdit?.(),
      }),
      createAction({
        name: t("Duplicate"),
        visible: !!can.duplicate,
        icon: <DuplicateIcon />,
        section,
        perform: () => templates.duplicate(template),
      }),
      moveTemplate,
      ActionSeparator,
      copyTemplate,
      ActionSeparator,
      deleteTemplate,
    ],
    [can.update, can.duplicate, onEdit, t, template, templates]
  );
  const rootAction = useMenuAction(actions);

  return (
    <ActionContextProvider value={{ activeModels: [template] }}>
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
