import copy from "copy-to-clipboard";
import { addDays, endOfDay } from "date-fns";
import Share from "~/models/Share";
import {
  ActionSeparator,
  createAction,
  createActionWithChildren,
  createInternalLinkAction,
} from "..";
import {
  everyActiveModel,
  performBatchOnActiveModels,
} from "~/actions/definitions/common";
import { ArrowIcon, CalendarIcon, CopyIcon, TrashIcon } from "outline-icons";
import { ShareSection } from "../sections";
import type { ActionContext } from "~/types";
import env from "~/env";
import { toast } from "sonner";
import { errToString } from "@shared/utils/error";
import { ShareExpiryDialog } from "~/components/Sharing/components/ShareExpiryDialog";

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

export const customShareExpiry = createAction({
  name: ({ t }) => `${t("Custom")}…`,
  analyticsName: "Set custom share expiry",
  section: ShareSection,
  perform: (context) => {
    const share = singleActiveShare(context);
    if (!share) {
      return;
    }

    const { dialogs } = context.stores;
    dialogs.openModal({
      title: context.t("Set expiry"),
      width: "600px",
      content: (
        <ShareExpiryDialog share={share} onSubmit={dialogs.closeAllModals} />
      ),
    });
  },
});

export const removeShareExpiry = createAction({
  name: ({ t }) => t("Remove expiry"),
  analyticsName: "Remove share expiry",
  section: ShareSection,
  visible: (context) => !!singleActiveShare(context)?.expiresAt,
  perform: (context) =>
    saveShareExpiry(context, null, context.t("Expiry removed")),
});

export const setShareExpiry = createActionWithChildren({
  name: ({ t }) => t("Set expiry"),
  analyticsName: "Set share expiry",
  section: ShareSection,
  icon: <CalendarIcon />,
  visible: (context) => {
    const { auth, policies } = context.stores;
    const share = singleActiveShare(context);
    return (
      !!share &&
      !!policies.abilities(auth.team?.id || "").share &&
      !!policies.abilities(share.id).update
    );
  },
  children: [
    ...[1, 7, 30].map((days) =>
      createAction({
        name: ({ t }) => t("{{ count }} days", { count: days }),
        analyticsName: "Set share expiry preset",
        section: ShareSection,
        perform: (context) =>
          saveShareExpiry(
            context,
            endOfDay(addDays(new Date(), days)),
            context.t("Expiry updated")
          ),
      })
    ),
    customShareExpiry,
    ActionSeparator,
    removeShareExpiry,
  ],
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

const saveShareExpiry = async (
  context: ActionContext,
  date: Date | null,
  message: string
) => {
  const share = singleActiveShare(context);
  if (!share) {
    return;
  }

  try {
    await share.save({ expiresAt: date ? date.toISOString() : null });
    toast.success(message);
  } catch (err) {
    toast.error(errToString(err));
  }
};

const singleActiveShare = ({ getActiveModels }: ActionContext) => {
  const shares = getActiveModels(Share);
  return shares.length === 1 ? shares[0] : undefined;
};
