import { SearchQuery } from "@server/models";

export default function presentSearchQuery(searchQuery: SearchQuery) {
  return {
    id: searchQuery.id,
    query: searchQuery.query,
    createdAt: searchQuery.createdAt,
  };
}
