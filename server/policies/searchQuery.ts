import { SearchQuery, User } from "@server/models";
import { allow } from "./cancan";

allow(
  User,
  ["read", "delete"],
  SearchQuery,
  (user, searchQuery) => user && user.id === searchQuery?.userId
);
