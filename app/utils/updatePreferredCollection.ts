import Collection from "~/models/Collection";
import Team from "~/models/Team";

const updatePreferredCollection = (
  actionOnCollection: "update" | "delete",
  collectionInfo: Partial<Pick<Collection, "id" | "permission">>,
  team?: Team | null
) => {
  if (!team) {
    return;
  }

  const deletedCollectionWasPreffered =
    actionOnCollection === "delete" &&
    team.defaultCollectionId === collectionInfo.id;

  const preferredCollectionIsPrivate =
    actionOnCollection === "update" &&
    collectionInfo.permission === null &&
    team.defaultCollectionId === collectionInfo.id;

  if (deletedCollectionWasPreffered || preferredCollectionIsPrivate) {
    team.defaultCollectionId = null;
  }
};

export default updatePreferredCollection;
