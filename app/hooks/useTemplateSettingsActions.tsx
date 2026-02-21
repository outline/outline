import * as React from "react";
import { DuplicateIcon, EditIcon } from "outline-icons";
import { useTranslation } from "react-i18next";
import type Template from "~/models/Template";
import { ActionSeparator, createAction } from "~/actions";
import {
  copyTemplate,
  deleteTemplate,
  moveTemplate,
} from "~/actions/definitions/templates";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import { useMenuAction } from "~/hooks/useMenuAction";

/**
 * Hook that constructs the action menu for template management operations.
 *
 * @param template - the template to build actions for, or null to skip.
 * @param onEdit - optional callback to handle editing the template.
 * @returns action with children for use in menus.
 */
export function useTemplateSettingsActions(
  template: Template | null,
  onEdit?: () => void
) {
  const { t } = useTranslation();
  const { templates } = useStores();
  const can = usePolicy(template ?? ({} as Template));

  const section = "Template";
  const actions = React.useMemo(
    () =>
      !template
        ? []
        : [
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

  return useMenuAction(actions);
}
