import { APM } from "@server/logging/tracing";
import Collection from "@server/models/Collection";

function present(collection: Collection) {
  return {
    id: collection.id,
    url: collection.url,
    urlId: collection.urlId,
    name: collection.name,
    description: collection.description,
    sort: collection.sort,
    icon: collection.icon,
    index: collection.index,
    color: collection.color || "#4E5C6E",
    permission: collection.permission,
    sharing: collection.sharing,
    createdAt: collection.createdAt,
    updatedAt: collection.updatedAt,
    deletedAt: collection.deletedAt,
    documents: collection.documentStructure || [],
  };
}

export default APM.traceFunction({
  serviceName: "presenter",
  spanName: "collection",
})(present);
