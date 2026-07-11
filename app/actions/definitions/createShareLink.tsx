import { PlusIcon } from "outline-icons";
import { createAction } from "~/actions";
import { TeamSection } from "../sections";
import stores from "~/stores";
import { ShareLinkCreateDialog } from "~/components/ShareLinkCreateDialog";

export const createShareLink = createAction({
  name: ({ t }) => `${t("New link")}...`,
  analyticsName: "Create share link",
  icon: <PlusIcon />,
  keywords: "share link publish",
  section: TeamSection,
  visible: () =>
    stores.policies.abilities(stores.auth.team?.id || "").createShare,
  perform: ({ t, stores }) => {
    stores.dialogs.openModal({
      title: t("Create a share link"),
      content: (
        <ShareLinkCreateDialog onSubmit={stores.dialogs.closeAllModals} />
      ),
    });
  },
});
