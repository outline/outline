import { SearchQuery, User } from "@server/models";
import policy from "./policy";

const { allow } = policy;

allow(User, ["read", "delete"], SearchQuery, (user, searchQuery) => {
  return user && user.id === searchQuery.userId;
});
