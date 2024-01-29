import { SearchQuery } from "@server/models";

export default function presentSearchQuery(searchQuery: SearchQuery) {
  return {
    id: searchQuery.id,
    query: searchQuery.query,
    source: searchQuery.source,
    createdAt: searchQuery.createdAt,
    answer: searchQuery.answer,
    score: searchQuery.score,
  };
}
