import copy from "copy-to-clipboard";
import { LinkIcon, RestoreIcon } from "outline-icons";
import * as React from "react";
import { matchPath } from "react-router-dom";
import { toast } from "sonner";
import stores from "~/stores";
import { createAction } from "~/actions";
import { RevisionSection } from "~/actions/sections";
import history from "~/utils/history";
import {
  documentHistoryPath,
  matchDocumentHistory,
} from "~/utils/routeHelpers";

export const restoreRevision = createAction({
  name: ({ t }) => t("Restore revision"),
  analyticsName: "Restore revision",
  icon: <RestoreIcon />,
  section: RevisionSection,
  visible: ({ activeDocumentId }) =>
    !!activeDocumentId && stores.policies.abilities(activeDocumentId).update,
  perform: async ({ event, location, activeDocumentId }) => {
    event?.preventDefault();
    if (!activeDocumentId) {
      return;
    }

    const match = matchPath<{ revisionId: string }>(location.pathname, {
      path: matchDocumentHistory,
    });
    const revisionId = match?.params.revisionId;

    const document = stores.documents.get(activeDocumentId);
    if (!document) {
      return;
    }

    history.push(document.url, {
      restore: true,
      revisionId,
    });
  },
});

export const copyLinkToRevision = createAction({
  name: ({ t }) => t("Copy link"),
  analyticsName: "Copy link to revision",
  icon: <LinkIcon />,
  section: RevisionSection,
  perform: async ({ activeDocumentId, t }) => {
    if (!activeDocumentId) {
      return;
    }

    const match = matchPath<{ revisionId: string }>(location.pathname, {
      path: matchDocumentHistory,
    });
    const revisionId = match?.params.revisionId;
    const document = stores.documents.get(activeDocumentId);
    if (!document) {
      return;
    }

    const url = `${window.location.origin}${documentHistoryPath(
      document,
      revisionId
    )}`;

    copy(url, {
      format: "text/plain",
      onCopy: () => {
        toast.message(t("Link copied"));
      },
    });
  },
});

export const rootRevisionActions = [];
