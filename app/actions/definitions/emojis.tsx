import { PlusIcon } from "outline-icons";
import { createAction } from "~/actions";
import { TeamSection } from "../sections";
import stores from "~/stores";
import { EmojiCreateDialog } from "~/components/EmojiCreateDialog";

export const createEmoji = createAction({
  name: ({ t }) => `${t("New emoji")}…`,
  analyticsName: "Create emoji",
  icon: <PlusIcon />,
  keywords: "emoji custom upload image",
  section: TeamSection,
  visible: () =>
    stores.policies.abilities(stores.auth.team?.id || "").createEmoji,
  perform: ({ t }) => {
    stores.dialogs.openModal({
      title: t("Upload emoji"),
      content: <EmojiCreateDialog onSubmit={stores.dialogs.closeAllModals} />,
    });
  },
});
