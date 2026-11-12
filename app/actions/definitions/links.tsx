import {
  IndentIcon,
  InsertAboveIcon,
  InsertBelowIcon,
  LinkIcon,
} from "outline-icons";
import { createAction, createActionWithChildren } from "~/actions";
import {
  ActiveCollectionSection,
  ActiveDocumentSection,
} from "~/actions/sections";
import { openAddLinkDialog } from "~/components/Sidebar/components/LinkDialog";
import Collection from "~/models/Collection";
import type Document from "~/models/Document";
import type { ActionContext } from "~/types";
import {
  canCreateSiblingDocument,
  findDocumentSiblingIndex,
} from "./documents";

export const addLinkToCollection = createAction({
  name: ({ t }) => `${t("Add link")}…`,
  analyticsName: "Add link",
  section: ActiveCollectionSection,
  icon: <LinkIcon />,
  keywords: "url bookmark",
  visible: ({ getActiveModel, getActivePolicies }) =>
    !!getActiveModel(Collection)?.documents &&
    getActivePolicies(Collection).some(
      (policy) => policy.abilities.createDocument
    ),
  perform: ({ getActiveModel, stores, t }) => {
    const collection = getActiveModel(Collection);
    if (collection) {
      openAddLinkDialog({ stores, t, collection, index: 0 });
    }
  },
});

/**
 * Returns the active document and its collection when a link can be added
 * next to or inside it. Links live in the collection structure, so the
 * document must be published in a collection whose structure is loaded.
 *
 * @param stores - the root stores.
 * @param activeDocumentId - the id of the active document.
 * @returns the document and collection, or undefined.
 */
function getLinkLocation(
  stores: ActionContext["stores"],
  activeDocumentId: string | undefined
): { document: Document; collection: Collection } | undefined {
  const document = activeDocumentId
    ? stores.documents.get(activeDocumentId)
    : undefined;
  if (!document?.collectionId || document.isDraft || document.isDeleted) {
    return undefined;
  }
  const collection = stores.collections.get(document.collectionId);
  return collection?.documents ? { document, collection } : undefined;
}

const canAddLinkBeside = (
  stores: ActionContext["stores"],
  activeDocumentId: string | undefined
) => {
  const location = getLinkLocation(stores, activeDocumentId);
  return (
    !!location?.collection.isManualSort &&
    canCreateSiblingDocument(stores, location.document)
  );
};

const canAddLinkInside = (
  stores: ActionContext["stores"],
  activeDocumentId: string | undefined
) => {
  const location = getLinkLocation(stores, activeDocumentId);
  return (
    !!location &&
    stores.policies.abilities(location.document.id).createChildDocument
  );
};

/**
 * Returns an action handler that opens the dialog to add a link at the given
 * position relative to the active document.
 *
 * @param position - where to add the link.
 * @returns the action handler.
 */
const addLinkAt =
  (position: "above" | "below" | "inside") =>
  ({ activeDocumentId, stores, t }: ActionContext) => {
    const location = getLinkLocation(stores, activeDocumentId);
    if (!location) {
      return;
    }
    const { collection, document } = location;
    const index = findDocumentSiblingIndex(stores, document);

    openAddLinkDialog({
      stores,
      t,
      collection,
      ...(position === "inside"
        ? { parentDocumentId: document.id }
        : {
            parentDocumentId: document.parentDocumentId ?? undefined,
            index: position === "above" ? Math.max(0, index) : index + 1,
          }),
    });
  };

const addLinkAbove = createAction({
  name: ({ t, isMenu }) =>
    isMenu ? `${t("Above")}…` : `${t("Add link above")}…`,
  analyticsName: "Add link above",
  section: ActiveDocumentSection,
  icon: <InsertAboveIcon />,
  keywords: "url bookmark",
  visible: ({ activeDocumentId, stores }) =>
    canAddLinkBeside(stores, activeDocumentId),
  perform: addLinkAt("above"),
});

const addLinkBelow = createAction({
  name: ({ t, isMenu }) =>
    isMenu ? `${t("Below")}…` : `${t("Add link below")}…`,
  analyticsName: "Add link below",
  section: ActiveDocumentSection,
  icon: <InsertBelowIcon />,
  keywords: "url bookmark",
  visible: ({ activeDocumentId, stores }) =>
    canAddLinkBeside(stores, activeDocumentId),
  perform: addLinkAt("below"),
});

const addNestedLink = createAction({
  name: ({ t, isMenu }) =>
    isMenu ? `${t("Inside")}…` : `${t("Add nested link")}…`,
  analyticsName: "Add nested link",
  section: ActiveDocumentSection,
  icon: <IndentIcon />,
  keywords: "url bookmark",
  visible: ({ activeDocumentId, stores }) =>
    canAddLinkInside(stores, activeDocumentId),
  perform: addLinkAt("inside"),
});

export const addLink = createActionWithChildren({
  name: ({ t }) => t("Add link"),
  analyticsName: "Add link",
  section: ActiveDocumentSection,
  icon: <LinkIcon />,
  keywords: "url bookmark",
  visible: ({ activeDocumentId, stores }) =>
    !!getLinkLocation(stores, activeDocumentId)?.collection.isManualSort &&
    (canAddLinkBeside(stores, activeDocumentId) ||
      canAddLinkInside(stores, activeDocumentId)),
  children: [addLinkAbove, addLinkBelow, addNestedLink],
});

export const addLinkInAlphabeticalCollection = createAction({
  name: ({ t }) => `${t("Add link")}…`,
  analyticsName: "Add nested link",
  section: ActiveDocumentSection,
  icon: <LinkIcon />,
  keywords: "url bookmark",
  visible: ({ activeDocumentId, stores }) =>
    getLinkLocation(stores, activeDocumentId)?.collection.isManualSort ===
      false && canAddLinkInside(stores, activeDocumentId),
  perform: addLinkAt("inside"),
});
