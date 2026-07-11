import copy from "copy-to-clipboard";
import { errToString } from "@shared/utils/error";
import type Share from "~/models/Share";
import { createAction, createInternalLinkAction } from "..";
import { ArrowIcon, CopyIcon, EditIcon, TrashIcon } from "outline-icons";
import { ShareSection } from "../sections";
import env from "~/env";
import { toast } from "sonner";
import { ShareLinkCreateDialog } from "~/components/ShareLinkCreateDialog";
import { ShareTypes } from "@shared/types";

export const copyShareUrlFactory = ({ share }: { share: Share }) =>
  createAction({
    name: ({ t }) => t("Copy link"),
    analyticsName: "Copy share link",
    section: ShareSection,
    icon: <CopyIcon />,
    perform: ({ t }) => {
      copy(share.url, {
        debug: env.ENVIRONMENT !== "production",
        format: "text/plain",
      });
      toast.success(t("Share link copied"));
    },
  });

export const goToShareSourceFactory = ({ share }: { share: Share }) =>
  createInternalLinkAction({
    name: ({ t }) =>
      share.collectionId ? t("Go to collection") : t("Go to document"),
    analyticsName: "Go to share source",
    section: ShareSection,
    icon: <ArrowIcon />,
    to: {
      pathname: share.sourcePathWithFallback,
      state: { sidebarContext: "collections" }, // optimistic preference of "collections"
    },
  });

export const revokeShareFactory = ({
  share,
  can,
}: {
  share: Share;
  can: Record<string, boolean>;
}) =>
  createAction({
    name: ({ t }) => t("Revoke link"),
    analyticsName: "Revoke share",
    section: ShareSection,
    icon: <TrashIcon />,
    dangerous: true,
    visible: !!can.revoke,
    perform: async ({ t, stores }) => {
      try {
        await stores.shares.revoke(share);
        toast.message(t("Share link revoked"));
      } catch (err) {
        toast.error(errToString(err));
      }
    },
  });

export const editShareFactory = ({
  share,
  can,
}: {
  share: Share;
  can: Record<string, boolean>;
}) =>
  createAction({
    name: ({ t }) => t("Edit link"),
    analyticsName: "Edit share link",
    section: ShareSection,
    icon: <EditIcon />,
    visible: !!can.revoke && share.type === ShareTypes.Expiring,
    perform: ({ t, stores }) => {
      stores.dialogs.openModal({
        title: t("Edit share link"),
        content: (
          <ShareLinkCreateDialog
            share={share}
            onSubmit={stores.dialogs.closeAllModals}
          />
        ),
      });
    },
  });

// to do:
// export const togglePublishShareFactory = () => {};
