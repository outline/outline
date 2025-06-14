import { PlusIcon } from "outline-icons";
import stores from "~/stores";
import Emoji from "~/models/Emoji";
import { EmojiUploadDialog } from "~/components/EmojiDialogs";
import { createAction } from "~/actions";
import { TeamSection } from "~/actions/sections";

export const createEmoji = createAction({
  name: ({ t }) => `${t("Add emoji")}…`,
  analyticsName: "Create emoji",
  icon: <PlusIcon />,
  keywords: "emoji custom upload image",
  section: TeamSection,
  visible: () =>
    stores.policies.abilities(stores.auth.team?.id || "").createEmoji,
  perform: ({ t }) => {
    stores.dialogs.openModal({
      title: t("Add custom emoji"),
      content: <EmojiUploadDialog onSubmit={stores.dialogs.closeAllModals} />,
    });
  },
});

export const deleteEmojiActionFactory = (emoji: Emoji) =>
  createAction({
    name: ({ t }) => `${t("Delete")}…`,
    analyticsName: "Delete emoji",
    section: TeamSection,
    dangerous: true,
    visible: () => {
      const can = stores.policies.abilities(emoji.id);
      return can.delete;
    },
    perform: async () => {
      await stores.emojis.delete(emoji);
    },
  });
