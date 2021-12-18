export default function present(searchQuery: any) {
  return {
    id: searchQuery.id,
    query: searchQuery.query,
    createdAt: searchQuery.createdAt,
  };
}
