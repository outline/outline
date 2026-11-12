import { LinkIcon } from "outline-icons";
import { createAction } from "~/actions";
import {
  ActiveCollectionSection,
  ActiveDocumentSection,
} from "~/actions/sections";
import { openAddLinkDialog } from "~/components/Sidebar/components/LinkDialog";
import Collection from "~/models/Collection";
import type Document from "~/models/Document";
import type { ActionContext } from "~/types";

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

export const addLinkToDocument = createAction({
  name: ({ t }) => `${t("Add link")}…`,
  analyticsName: "Add nested link",
  section: ActiveDocumentSection,
  icon: <LinkIcon />,
  keywords: "url bookmark",
  visible: ({ activeDocumentId, stores }) => {
    const location = getLinkLocation(stores, activeDocumentId);
    return (
      !!location &&
      stores.policies.abilities(location.document.id).createChildDocument
    );
  },
  perform: ({ activeDocumentId, stores, t }) => {
    const location = getLinkLocation(stores, activeDocumentId);
    if (location) {
      openAddLinkDialog({
        stores,
        t,
        collection: location.collection,
        parentDocumentId: location.document.id,
      });
    }
  },
});

/**
 * Returns the active document and its collection when a link can be added
 * inside it. Links live in the collection structure, so the document must be
 * published in a collection whose structure is loaded.
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
