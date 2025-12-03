import copy from "copy-to-clipboard";
import Share from "~/models/Share";
import { createAction, createInternalLinkAction } from "..";
import { ArrowIcon, CopyIcon, TrashIcon } from "outline-icons";
import { ShareSection } from "../sections";
import env from "~/env";
import { toast } from "sonner";

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
        toast.error(err.message);
      }
    },
  });
