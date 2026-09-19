import { PlusIcon, ReplaceIcon, TrashIcon } from "outline-icons";
import { dialogActionFactory } from "~/actions/definitions/common";
import { EmojiSecion, TeamSection } from "../sections";
import stores from "~/stores";
import type Emoji from "~/models/Emoji";
import { EmojiCreateDialog } from "~/components/EmojiDialog/EmojiCreateDialog";
import { EmojiDeleteDialog } from "~/components/EmojiDialog/EmojiDeleteDialog";
import { EmojiReplaceDialog } from "~/components/EmojiDialog/EmojiReplaceDialog";

export const createEmoji = dialogActionFactory({
  analyticsName: "Create emoji",
  section: TeamSection,
  name: (t) => `${t("New emoji")}…`,
  title: (t) => t("Upload emoji"),
  content: (onSubmit) => <EmojiCreateDialog onSubmit={onSubmit} />,
  icon: <PlusIcon />,
  keywords: "emoji custom upload image",
  visible: () =>
    stores.policies.abilities(stores.auth.team?.id || "").createEmoji,
});

export const replaceEmojiActionFactory = (emoji: Emoji) =>
  dialogActionFactory({
    analyticsName: "Replace emoji",
    section: EmojiSecion,
    name: (t) => `${t("Replace")}…`,
    title: (t) => t("Replace image"),
    content: (onSubmit) => (
      <EmojiReplaceDialog emoji={emoji} onSubmit={onSubmit} />
    ),
    icon: <ReplaceIcon />,
    visible: () => stores.policies.abilities(emoji.id).update,
  });

export const deleteEmojiActionFactory = (emoji: Emoji) =>
  dialogActionFactory({
    analyticsName: "Delete emoji",
    section: EmojiSecion,
    name: (t) => `${t("Delete")}…`,
    title: (t) => t("Delete Emoji"),
    content: (onSubmit) => (
      <EmojiDeleteDialog emoji={emoji} onSubmit={onSubmit} />
    ),
    icon: <TrashIcon />,
    dangerous: true,
    visible: () => stores.policies.abilities(emoji.id).delete,
  });
