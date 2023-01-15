import { Star } from "@server/models";

export default function presentStar(star: Star) {
  return {
    id: star.id,
    documentId: star.documentId,
    collectionId: star.collectionId,
    index: star.index,
    createdAt: star.createdAt,
    updatedAt: star.updatedAt,
  };
}
