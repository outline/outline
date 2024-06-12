import DataAttribute from "@server/models/DataAttribute";

export default function presentDataAttribute(dataAttribute: DataAttribute) {
  return {
    id: dataAttribute.id,
    name: dataAttribute.name,
    description: dataAttribute.description,
    dataType: dataAttribute.dataType,
    options: dataAttribute.options,
    pinned: dataAttribute.pinned,
    createdAt: dataAttribute.createdAt,
    updatedAt: dataAttribute.updatedAt,
    deletedAt: dataAttribute.deletedAt,
  };
}
