import { User, Reaction } from "@server/models";
import { allow } from "./cancan";
import { isOwner } from "./utils";

allow(User, "delete", Reaction, isOwner);
