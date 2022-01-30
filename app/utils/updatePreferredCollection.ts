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
    team.preferredCollectionId === collectionInfo.id;

  const preferredCollectionIsPrivate =
    actionOnCollection === "update" &&
    collectionInfo.permission === null &&
    team.preferredCollectionId === collectionInfo.id;

  if (deletedCollectionWasPreffered || preferredCollectionIsPrivate) {
    team.preferredCollectionId = null;
  }
};

export default updatePreferredCollection;
