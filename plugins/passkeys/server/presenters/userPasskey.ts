import type UserPasskey from "@server/models/UserPasskey";

export default function presentUserPasskey(userPasskey: UserPasskey) {
  return {
    id: userPasskey.id,
    createdAt: userPasskey.createdAt,
    updatedAt: userPasskey.updatedAt,
    name: userPasskey.name,
    userAgent: userPasskey.userAgent,
  };
}
