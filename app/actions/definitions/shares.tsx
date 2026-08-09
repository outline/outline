import copy from "copy-to-clipboard";
import Share from "~/models/Share";
import { createAction, createInternalLinkAction } from "..";
import {
  everyActiveModel,
  performBatchOnActiveModels,
} from "~/actions/definitions/common";
import { ArrowIcon, CopyIcon, TrashIcon } from "outline-icons";
import { ShareSection } from "../sections";
import type { ActionContext } from "~/types";
import env from "~/env";
import { toast } from "sonner";

export const copyShareUrl = createAction({
  name: ({ t }) => t("Copy link"),
  analyticsName: "Copy share link",
  section: ShareSection,
  icon: <CopyIcon />,
  visible: (context) => !!singleActiveShare(context),
  perform: (context) => {
    const share = singleActiveShare(context);
    if (!share) {
      return;
    }

    copy(share.url, {
      debug: env.ENVIRONMENT !== "production",
      format: "text/plain",
    });
    toast.success(context.t("Share link copied"));
  },
});

export const goToShareSource = createInternalLinkAction({
  name: (context) =>
    singleActiveShare(context)?.collectionId
      ? context.t("Go to collection")
      : context.t("Go to document"),
  analyticsName: "Go to share source",
  section: ShareSection,
  icon: <ArrowIcon />,
  visible: (context) => !!singleActiveShare(context),
  to: (context) => {
    const share = singleActiveShare(context);
    return share
      ? {
          pathname: share.sourcePathWithFallback,
          state: { sidebarContext: "collections" }, // optimistic preference of "collections"
        }
      : "";
  },
});

export const revokeShare = createAction({
  name: ({ t }) => t("Revoke link"),
  analyticsName: "Revoke share",
  section: ShareSection,
  icon: <TrashIcon />,
  dangerous: true,
  visible: (context) =>
    everyActiveModel(
      context,
      Share,
      (share) => context.stores.policies.abilities(share.id).revoke
    ),
  perform: async (context) => {
    const shares = context.getActiveModels(Share);

    const succeeded = await performBatchOnActiveModels(
      context,
      Share,
      (share) => context.stores.shares.revoke(share),
      (models, count, t) =>
        models.length === 1
          ? t("Share link revoked")
          : t("{{ count }} share link revoked", { count })
    );

    if (succeeded < shares.length) {
      toast.error(
        context.t("Could not revoke {{ count }} share link", {
          count: shares.length - succeeded,
        })
      );
    }
  },
});

const singleActiveShare = ({ getActiveModels }: ActionContext) => {
  const shares = getActiveModels(Share);
  return shares.length === 1 ? shares[0] : undefined;
};
