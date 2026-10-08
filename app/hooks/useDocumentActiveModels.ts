import type Document from "~/models/Document";
import type Model from "~/models/base/Model";
import useStores from "~/hooks/useStores";

/**
 * Returns the models that document actions should operate on – the document
 * itself, and its collection unless the document is only reachable through a
 * direct share with the user.
 *
 * @param document the document the actions will be performed on.
 * @returns the active models to provide to the action context.
 */
export function useDocumentActiveModels(document: Document): Model[] {
  const { userMemberships, groupMemberships } = useStores();

  const isShared = !!(
    userMemberships.getByDocumentId(document.id) ||
    groupMemberships.getByDocumentId(document.id)
  );

  return [
    document,
    ...(!isShared && document.collection ? [document.collection] : []),
  ];
}
