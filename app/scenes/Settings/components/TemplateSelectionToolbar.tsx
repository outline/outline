import { observer } from "mobx-react";
import {
  deleteTemplate,
  duplicateTemplate,
  publishTemplate,
} from "~/actions/definitions/templates";
import { ModelSelectionActionToolbar } from "~/components/ModelSelectionActionToolbar";
import { useModelSelection } from "~/components/ModelSelectionContext";
import useStores from "~/hooks/useStores";
import type Template from "~/models/Template";
import type { Action } from "~/types";

/**
 * The template actions offered in the bulk selection toolbar. These are the
 * same action definitions used by the template menu — they operate on the
 * active models, which the toolbar feeds from the current selection.
 */
const toolbarActions: Action[] = [
  publishTemplate,
  duplicateTemplate,
  deleteTemplate,
];

/**
 * Renders the selection toolbar with the bulk actions available for templates.
 *
 * @returns the toolbar element, or null when no list selection is in scope.
 */
function TemplateSelectionToolbar() {
  const selection = useModelSelection();
  const { templates } = useStores();

  if (!selection) {
    return null;
  }

  const selectedTemplates = selection.selectedIds
    .map((id) => templates.get(id))
    .filter((template): template is Template => !!template);

  return (
    <ModelSelectionActionToolbar
      models={selectedTemplates}
      actions={toolbarActions}
    />
  );
}

export default observer(TemplateSelectionToolbar);
