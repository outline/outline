import type DocumentDataAttribute from "@server/models/DocumentDataAttribute";

export default function presentDocumentDataAttribute(
  dataAttribute: DocumentDataAttribute
) {
  return {
    id: dataAttribute.id,
    value: dataAttribute.value,
    dataAttributeId: dataAttribute.dataAttributeId,
    documentId: dataAttribute.documentId,
    createdAt: dataAttribute.createdAt,
    updatedAt: dataAttribute.updatedAt,
  };
}
