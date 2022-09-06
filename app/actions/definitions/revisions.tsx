import { RestoreIcon } from "outline-icons";
import * as React from "react";
import { matchPath } from "react-router-dom";
import stores from "~/stores";
import { createAction } from "~/actions";
import { RevisionSection } from "~/actions/sections";
import history from "~/utils/history";
import { matchDocumentHistory } from "~/utils/routeHelpers";

export const restoreRevision = createAction({
  name: ({ t }) => t("Restore revision"),
  icon: <RestoreIcon />,
  section: RevisionSection,
  visible: ({ activeDocumentId, stores }) =>
    !!activeDocumentId && stores.policies.abilities(activeDocumentId).update,
  perform: async ({ t, event, location, activeDocumentId }) => {
    event?.preventDefault();
    if (!activeDocumentId) {
      return;
    }

    const match = matchPath<{ revisionId: string }>(location.pathname, {
      path: matchDocumentHistory,
    });
    const revisionId = match?.params.revisionId;

    const { team } = stores.auth;
    const document = stores.documents.get(activeDocumentId);
    if (!document) {
      return;
    }

    if (team?.collaborativeEditing) {
      history.push(document.url, {
        restore: true,
        revisionId,
      });
    } else {
      await document.restore({
        revisionId,
      });
      stores.toasts.showToast(t("Document restored"), {
        type: "success",
      });
      history.push(document.url);
    }
  },
});

export const rootRevisionActions = [restoreRevision];
