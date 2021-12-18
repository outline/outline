export default function present(searchQuery: any) {
  return {
    id: searchQuery.id,
    query: searchQuery.query,
  };
}
