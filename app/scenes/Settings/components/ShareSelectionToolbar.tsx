import { observer } from "mobx-react";
import { revokeShare } from "~/actions/definitions/shares";
import { ModelSelectionActionToolbar } from "~/components/ModelSelectionActionToolbar";
import { useModelSelection } from "~/components/ModelSelectionContext";
import useStores from "~/hooks/useStores";
import type Share from "~/models/Share";
import type { Action } from "~/types";

/**
 * The share actions offered in the bulk selection toolbar. These are the same
 * action definitions used by the share menu — they operate on the active
 * models, which the toolbar feeds from the current selection.
 */
const toolbarActions: Action[] = [revokeShare];

/**
 * Renders the selection toolbar with the bulk actions available for shares.
 *
 * @returns the toolbar element, or null when no list selection is in scope.
 */
function ShareSelectionToolbar() {
  const selection = useModelSelection();
  const { shares } = useStores();

  if (!selection) {
    return null;
  }

  const selectedShares = selection.selectedIds
    .map((id) => shares.get(id))
    .filter((share): share is Share => !!share);

  return (
    <ModelSelectionActionToolbar
      models={selectedShares}
      actions={toolbarActions}
    />
  );
}

export default observer(ShareSelectionToolbar);
