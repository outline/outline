import { User, Star } from "@server/models";
import { allow } from "./cancan";

allow(
  User,
  ["update", "delete"],
  Star,
  (user, star) => user.id === star?.userId
);
