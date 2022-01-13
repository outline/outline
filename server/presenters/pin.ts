import { Pin } from "@server/models";

export default function present(pin: Pin) {
  return {
    id: pin.id,
    documentId: pin.documentId,
    collectionId: pin.collectionId,
    index: pin.index,
    createdAt: pin.createdAt,
    updatedAt: pin.updatedAt,
  };
}
