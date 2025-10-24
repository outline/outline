import { Star } from "@server/models";

export default function presentStar(star: Star) {
  return {
    id: star.id,
    documentId: star.documentId,
    collectionId: star.collectionId,
    parentId: star.parentId,
    isFolder: star.isFolder,
    index: star.index,
    createdAt: star.createdAt,
    updatedAt: star.updatedAt,
  };
}
