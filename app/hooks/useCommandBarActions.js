// @flow
import { useRegisterActions } from "kbar";
import { flattenDeep } from "lodash";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { actionToKBar } from "actions";
import useStores from "hooks/useStores";
import type { Action } from "types";

export default function useCommandBarActions(actions: Action[]) {
  const stores = useStores();
  const { t } = useTranslation();
  const location = useLocation();

  const context = {
    t,
    isCommandBar: true,
    isContextMenu: false,
    activeCollectionId: stores.ui.activeCollectionId,
    activeDocumentId: stores.ui.activeDocumentId,
    location,
    stores,
  };

  const registerable = flattenDeep(
    actions.map((action) => actionToKBar(action, context))
  );

  useRegisterActions(registerable, [
    registerable.map((r) => r.id).join(""),
    location.pathname,
  ]);
}
