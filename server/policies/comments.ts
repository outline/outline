import { User, Comment } from "@server/models";
import { allow } from "./cancan";

allow(User, ["update", "delete"], Comment, (user, comment) => {
  return comment?.createdById === user.id;
});
