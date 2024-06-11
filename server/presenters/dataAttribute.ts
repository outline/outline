import DataAttribute from "@server/models/DataAttribute";

export default function presentDataAttribute(dataAttribute: DataAttribute) {
  return {
    id: dataAttribute.id,
    name: dataAttribute.name,
    description: dataAttribute.description,
    createdAt: dataAttribute.createdAt,
    updatedAt: dataAttribute.updatedAt,
    archivedAt: dataAttribute.archivedAt,
  };
}
