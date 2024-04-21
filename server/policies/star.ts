import { User, Star } from "@server/models";
import { allow } from "./cancan";
import { isOwner } from "./utils";

allow(User, ["read", "update", "delete"], Star, isOwner);
