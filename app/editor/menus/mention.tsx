import { isEmail } from "class-validator";
import type { TFunction } from "i18next";
import {
  CollectionIcon,
  DocumentIcon,
  NewDocumentIcon,
  PlusIcon,
} from "outline-icons";
import { v4 as uuidv4 } from "uuid";
import Icon from "@shared/components/Icon";
import type { MenuItem } from "@shared/editor/types";
import { MentionType } from "@shared/types";
import {
  CollectionsSection,
  DocumentsSection,
  GroupSection,
  MentionUserSection,
} from "~/actions/sections";
import { Avatar, AvatarSize, GroupAvatar } from "~/components/Avatar";
import DocumentBreadcrumb from "~/components/DocumentBreadcrumb";
import Flex from "~/components/Flex";
import type Collection from "~/models/Collection";
import type Document from "~/models/Document";
import type Group from "~/models/Group";
import type User from "~/models/User";

/** A suggestion menu item that inserts a mention. */
export interface MentionMenuItem extends MenuItem {
  attrs: {
    id: string;
    type: MentionType;
    modelId: string;
    label: string;
    actorId?: string;
    nested?: boolean;
  };
}

/**
 * Builds a menu item that mentions a user.
 *
 * @param t The translation function.
 * @param user The user to mention.
 * @param actorId The id of the user inserting the mention.
 * @returns the menu item.
 */
export function userMentionItem(
  t: TFunction,
  user: User,
  actorId: string
): MentionMenuItem {
  return {
    name: "mention",
    icon: (
      <Flex align="center" justify="center" style={{ width: 24, height: 24 }}>
        <Avatar
          model={user}
          alt={t("Profile picture")}
          size={AvatarSize.Small}
        />
      </Flex>
    ),
    title: user.name,
    section: MentionUserSection,
    appendSpace: true,
    attrs: {
      id: uuidv4(),
      type: MentionType.User,
      modelId: user.id,
      actorId,
      label: user.name,
    },
  };
}

/**
 * Builds a menu item that mentions a group.
 *
 * @param t The translation function.
 * @param group The group to mention.
 * @param actorId The id of the user inserting the mention.
 * @returns the menu item.
 */
export function groupMentionItem(
  t: TFunction,
  group: Group,
  actorId: string
): MentionMenuItem {
  return {
    name: "mention",
    icon: (
      <Flex
        align="center"
        justify="center"
        style={{ width: 24, height: 24, marginRight: 4 }}
      >
        <GroupAvatar group={group} size={AvatarSize.Small} />
      </Flex>
    ),
    title: group.name,
    subtitle: t("{{ count }} members", {
      count: group.memberCount,
    }),
    section: GroupSection,
    appendSpace: true,
    attrs: {
      id: uuidv4(),
      type: MentionType.Group,
      modelId: group.id,
      actorId,
      label: group.name,
    },
  };
}

/**
 * Builds a menu item that mentions a collection.
 *
 * @param collection The collection to mention.
 * @param actorId The id of the user inserting the mention.
 * @returns the menu item.
 */
export function collectionMentionItem(
  collection: Collection,
  actorId: string
): MentionMenuItem {
  return {
    name: "mention",
    icon: collection.icon ? (
      <Icon
        value={collection.icon}
        initial={collection.initial}
        color={collection.color ?? undefined}
      />
    ) : (
      <CollectionIcon />
    ),
    title: collection.name,
    section: CollectionsSection,
    appendSpace: true,
    attrs: {
      id: uuidv4(),
      type: MentionType.Collection,
      modelId: collection.id,
      actorId,
      label: collection.name,
    },
  };
}

/**
 * Builds a menu item that mentions an existing document.
 *
 * @param document The document to mention.
 * @param actorId The id of the user inserting the mention.
 * @returns the menu item.
 */
export function documentMentionItem(
  document: Document,
  actorId: string
): MentionMenuItem {
  return {
    name: "mention",
    icon: document.icon ? (
      <Icon
        value={document.icon}
        initial={document.initial}
        color={document.color ?? undefined}
      />
    ) : (
      <DocumentIcon />
    ),
    title: document.title,
    subtitle: document.collectionId ? (
      <DocumentBreadcrumb document={document} onlyText maxDepth={2} />
    ) : undefined,
    section: DocumentsSection,
    appendSpace: true,
    attrs: {
      id: uuidv4(),
      type: MentionType.Document,
      modelId: document.id,
      actorId,
      label: document.title,
    },
  };
}

/**
 * Builds the menu items that create a new document titled with the search term,
 * either at the root or nested under the document being edited.
 *
 * @param t The translation function.
 * @param options The search term, the id of the user inserting the mention, the
 * id of the document being edited, if any, and whether the editor is able to
 * create documents.
 * @returns the menu items, hidden while there is no search term.
 */
export function createDocumentMentionItems(
  t: TFunction,
  options: {
    search: string;
    actorId: string;
    documentId?: string;
    canCreate: boolean;
  }
): MentionMenuItem[] {
  const { search, actorId, documentId, canCreate } = options;
  const title = search.trim();
  const visible = canCreate && !!title && !isEmail(title);

  return [
    {
      name: "link",
      icon: <PlusIcon />,
      title,
      section: DocumentsSection,
      subtitle: t("Create a new doc"),
      visible,
      priority: -1,
      appendSpace: true,
      attrs: {
        id: uuidv4(),
        type: MentionType.Document,
        modelId: uuidv4(),
        actorId,
        label: title,
      },
    },
    {
      name: "link",
      icon: <NewDocumentIcon />,
      title,
      section: DocumentsSection,
      subtitle: t("Create a nested doc"),
      visible: visible && !!documentId,
      priority: -2,
      appendSpace: true,
      attrs: {
        id: uuidv4(),
        type: MentionType.Document,
        modelId: uuidv4(),
        actorId,
        label: title,
        nested: true,
      },
    },
  ];
}
