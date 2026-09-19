import * as React from "react";
import { EditIcon } from "outline-icons";
import { useTranslation } from "react-i18next";
import type Template from "~/models/Template";
import { ActionSeparator, createAction } from "~/actions";
import {
  copyTemplate,
  deleteTemplate,
  duplicateTemplate,
  moveTemplate,
  publishTemplate,
} from "~/actions/definitions/templates";
import { ActiveTemplateSection } from "~/actions/sections";
import usePolicy from "~/hooks/usePolicy";
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
  const can = usePolicy(template);

  const actions = React.useMemo(
    () =>
      !template
        ? []
        : [
            createAction({
              name: `${t("Edit")}…`,
              visible: !!can.update && !!onEdit,
              icon: <EditIcon />,
              section: ActiveTemplateSection,
              perform: () => onEdit?.(),
            }),
            publishTemplate,
            duplicateTemplate,
            moveTemplate,
            ActionSeparator,
            copyTemplate,
            ActionSeparator,
            deleteTemplate,
          ],
    [can.update, onEdit, t, template]
  );

  return useMenuAction(actions);
}
