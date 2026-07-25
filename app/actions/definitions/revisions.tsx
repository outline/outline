import copy from "copy-to-clipboard";
import { LinkIcon, RestoreIcon, TrashIcon, DownloadIcon } from "outline-icons";
import { matchPath } from "react-router-dom";
import { toast } from "sonner";
import { ExportContentType } from "@shared/types";
import Revision from "~/models/Revision";
import stores from "~/stores";
import type { ActionContext } from "~/types";
import {
  createAction,
  createActionWithChildren,
  createInternalLinkAction,
} from "~/actions";
import { RevisionSection } from "~/actions/sections";
import env from "~/env";
import history from "~/utils/history";
import {
  documentHistoryPath,
  matchDocumentHistory,
  urlify,
} from "~/utils/routeHelpers";

function getActiveRevisionId({ location, getActiveModel }: ActionContext) {
  const match = matchPath<{ revisionId: string }>(location.pathname, {
    path: matchDocumentHistory,
  });
  return getActiveModel(Revision)?.id ?? match?.params.revisionId;
}

export const restoreRevision = createInternalLinkAction({
  name: ({ t }) => t("Restore"),
  analyticsName: "Restore revision",
  icon: <RestoreIcon />,
  section: RevisionSection,
  visible: (context) =>
    !!context.activeDocumentId &&
    stores.policies.abilities(context.activeDocumentId).update &&
    !!getActiveRevisionId(context),
  to: (context) => {
    const revisionId = getActiveRevisionId(context);
    const document = context.activeDocumentId
      ? stores.documents.get(context.activeDocumentId)
      : undefined;

    if (!document || !revisionId) {
      return context.location;
    }

    return {
      pathname: document.url,
      state: { restore: true, revisionId },
    };
  },
});

export const deleteRevision = createAction({
  name: ({ t }) => t("Delete"),
  analyticsName: "Delete revision",
  icon: <TrashIcon />,
  section: RevisionSection,
  dangerous: true,
  visible: ({ activeDocumentId }) =>
    !!activeDocumentId && stores.policies.abilities(activeDocumentId).update,
  perform: async ({ t, event, location, activeDocumentId }) => {
    event?.preventDefault();
    if (!activeDocumentId) {
      return;
    }

    const document = stores.documents.get(activeDocumentId);
    if (!document) {
      return;
    }

    const match = matchPath<{ revisionId: string }>(location.pathname, {
      path: matchDocumentHistory,
    });
    const revisionId = match?.params.revisionId;
    if (revisionId) {
      const revision = stores.revisions.get(revisionId);
      await revision?.delete();
      toast.success(t("This version of the document was deleted"));
      history.push(documentHistoryPath(document));
    }
  },
});

export const copyLinkToRevisionActionFactory = (revisionId: string) =>
  createAction({
    name: ({ t }) => t("Copy link"),
    analyticsName: "Copy link to revision",
    icon: <LinkIcon />,
    section: RevisionSection,
    perform: async ({ activeDocumentId, t }) => {
      if (!activeDocumentId) {
        return;
      }

      const document = stores.documents.get(activeDocumentId);
      if (!document) {
        return;
      }

      const url = urlify(documentHistoryPath(document, revisionId));

      copy(url, {
        format: "text/plain",
        onCopy: () => {
          toast.message(t("Link copied to clipboard"));
        },
      });
    },
  });

export const downloadRevisionAsHTMLActionFactory = (revisionId: string) =>
  createAction({
    name: ({ t }) => t("HTML"),
    analyticsName: "Download revision as HTML",
    section: RevisionSection,
    keywords: "html export",
    icon: <DownloadIcon />,
    iconInContextMenu: false,
    visible: ({ activeDocumentId }) =>
      !!activeDocumentId &&
      stores.policies.abilities(activeDocumentId).download,
    perform: async () => {
      const revision = stores.revisions.get(revisionId);
      await revision?.download(ExportContentType.Html);
    },
  });

export const downloadRevisionAsPDFActionFactory = (revisionId: string) =>
  createAction({
    name: ({ t }) => t("PDF"),
    analyticsName: "Download revision as PDF",
    section: RevisionSection,
    keywords: "export",
    icon: <DownloadIcon />,
    iconInContextMenu: false,
    visible: ({ activeDocumentId }) =>
      !!(
        activeDocumentId &&
        stores.policies.abilities(activeDocumentId).download &&
        env.PDF_EXPORT_ENABLED
      ),
    perform: ({ t }) => {
      const id = toast.loading(`${t("Exporting")}…`);
      const revision = stores.revisions.get(revisionId);
      return revision
        ?.download(ExportContentType.Pdf)
        .finally(() => id && toast.dismiss(id));
    },
  });

export const downloadRevisionAsMarkdownActionFactory = (revisionId: string) =>
  createAction({
    name: ({ t }) => t("Markdown"),
    analyticsName: "Download revision as Markdown",
    section: RevisionSection,
    keywords: "md markdown export",
    icon: <DownloadIcon />,
    iconInContextMenu: false,
    visible: ({ activeDocumentId }) =>
      !!activeDocumentId &&
      stores.policies.abilities(activeDocumentId).download,
    perform: async () => {
      const revision = stores.revisions.get(revisionId);
      await revision?.download(ExportContentType.Markdown);
    },
  });

export const downloadRevisionActionFactory = (revisionId: string) =>
  createActionWithChildren({
    name: ({ t, isMenu }) => (isMenu ? t("Download") : t("Download revision")),
    analyticsName: "Download revision",
    section: RevisionSection,
    icon: <DownloadIcon />,
    keywords: "export",
    visible: ({ activeDocumentId }) =>
      !!activeDocumentId &&
      stores.policies.abilities(activeDocumentId).download,
    children: [
      downloadRevisionAsHTMLActionFactory(revisionId),
      downloadRevisionAsPDFActionFactory(revisionId),
      downloadRevisionAsMarkdownActionFactory(revisionId),
    ],
  });

export const rootRevisionActions = [];
