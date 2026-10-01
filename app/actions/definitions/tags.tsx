import { EditIcon, MoveIcon, PaletteIcon, TrashIcon } from "outline-icons";
import { dialogActionFactory } from "~/actions/definitions/common";
import { TagSection } from "../sections";
import stores from "~/stores";
import type Tag from "~/models/Tag";
import {
  TagColorDialog,
  TagDeleteDialog,
  TagMergeDialog,
  TagRenameDialog,
} from "~/components/TagDialogs";
import { mergeTargetOptions } from "~/utils/tags";

export const renameTagActionFactory = (tag: Tag) =>
  dialogActionFactory({
    analyticsName: "Rename tag",
    section: TagSection,
    name: (t) => `${t("Rename")}…`,
    title: (t) => t("Rename tag"),
    content: (onSubmit) => <TagRenameDialog tag={tag} onSubmit={onSubmit} />,
    icon: <EditIcon />,
    visible: () => stores.policies.abilities(tag.id).update,
  });

export const changeTagColorActionFactory = (tag: Tag) =>
  dialogActionFactory({
    analyticsName: "Change tag color",
    section: TagSection,
    name: (t) => `${t("Change color")}…`,
    title: (t) => t("Change color"),
    content: (onSubmit) => <TagColorDialog tag={tag} onSubmit={onSubmit} />,
    icon: <PaletteIcon />,
    visible: () => stores.policies.abilities(tag.id).update,
  });

export const mergeTagActionFactory = (tag: Tag) =>
  dialogActionFactory({
    analyticsName: "Merge tag",
    section: TagSection,
    name: (t) => `${t("Merge into")}…`,
    title: (t) => t("Merge tag"),
    content: (onSubmit) => <TagMergeDialog tag={tag} onSubmit={onSubmit} />,
    icon: <MoveIcon />,
    visible: () =>
      !!stores.policies.abilities(tag.id).merge &&
      mergeTargetOptions(stores.tags.orderedData, tag.id).length > 0,
  });

export const deleteTagActionFactory = (tag: Tag) =>
  dialogActionFactory({
    analyticsName: "Delete tag",
    section: TagSection,
    name: (t) => `${t("Delete")}…`,
    title: (t) => t("Delete tag"),
    content: (onSubmit) => <TagDeleteDialog tag={tag} onSubmit={onSubmit} />,
    icon: <TrashIcon />,
    dangerous: true,
    visible: () => stores.policies.abilities(tag.id).delete,
  });
