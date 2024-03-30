import { Subscription, User } from "@server/models";
import { allow } from "./cancan";
import { isOwner } from "./utils";

allow(User, ["read", "update", "delete"], Subscription, isOwner);
