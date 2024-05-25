import { useTranslation } from "react-i18next";
import { useLocation } from "react-router";
import useStores from "~/hooks/useStores";
import { ActionContext } from "~/types";

/**
 * Hook to get the current action context, an object that is passed to all
 * action definitions.
 *
 * @param overrides Overides of the default action context.
 * @returns The current action context.
 */
export default function useActionContext(
  overrides?: Partial<ActionContext>
): ActionContext {
  const stores = useStores();
  const { t } = useTranslation();
  const location = useLocation();

  return {
    isContextMenu: false,
    isCommandBar: false,
    isButton: false,
    activeCollectionId: stores.ui.activeCollectionId ?? undefined,
    activeDocumentId: stores.ui.activeDocumentId,
    currentUserId: stores.auth.user?.id,
    currentTeamId: stores.auth.team?.id,
    ...overrides,
    location,
    stores,
    t,
  };
}
