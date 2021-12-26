import { useTranslation } from "react-i18next";
import { useLocation } from "react-router";
import useStores from "~/hooks/useStores";
import { ActionContext } from "~/types";

export default function useActionContext(
  overrides?: Partial<ActionContext>
): ActionContext {
  const stores = useStores();
  const { t } = useTranslation();
  const location = useLocation();

  return {
    isContextMenu: false,
    isCommandBar: false,
    activeCollectionId: stores.ui.activeCollectionId,
    activeDocumentId: stores.ui.activeDocumentId,
    currentUserId: stores.auth.user?.id,
    currentTeamId: stores.auth.team?.id,
    ...overrides,
    location,
    stores,
    t,
  };
}
