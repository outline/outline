import { SearchQuery, User } from "@server/models";
import { allow } from "./policy";

allow(
  User,
  ["read", "delete"],
  SearchQuery,
  (user, searchQuery) => user && user.id === searchQuery?.userId
);
