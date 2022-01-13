import { SearchQuery } from "@server/models";

export default function present(searchQuery: SearchQuery) {
  return {
    id: searchQuery.id,
    query: searchQuery.query,
    createdAt: searchQuery.createdAt,
  };
}
