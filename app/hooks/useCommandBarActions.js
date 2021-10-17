// @flow
import { useRegisterActions } from "kbar";
import { flattenDeep } from "lodash";
import { useTranslation } from "react-i18next";
import { actionToKBar } from "actions";
import useStores from "hooks/useStores";
import type { Action } from "types";

export function useCommandBarActions(actions: Action[]) {
  const stores = useStores();
  const { t } = useTranslation();

  const context = {
    t,
    isCommandBar: true,
    isContextMenu: false,
    activeCollectionId: stores.ui.activeCollectionId,
    activeDocumentId: stores.ui.activeDocumentId,
    stores,
  };

  useRegisterActions(
    flattenDeep(actions.map((action) => actionToKBar(action, context)))
  );
}
