import { SearchQuery, User } from "@server/models";
import { allow } from "./cancan";
import { isOwner } from "./utils";

allow(User, ["read", "delete"], SearchQuery, isOwner);
