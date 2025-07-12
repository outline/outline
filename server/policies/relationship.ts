import { User, Relationship } from "@server/models";
import { allow } from "./cancan";
import { isOwner } from "./utils";

allow(User, ["read"], Relationship, isOwner);
