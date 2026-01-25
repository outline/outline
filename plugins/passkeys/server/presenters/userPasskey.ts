import type UserPasskey from "@server/models/UserPasskey";

export default function presentUserPasskey(userPasskey: UserPasskey) {
  return {
    id: userPasskey.id,
    createdAt: userPasskey.createdAt,
    updatedAt: userPasskey.updatedAt,
    lastActiveAt: userPasskey.lastActiveAt,
    name: userPasskey.name,
    userAgent: userPasskey.userAgent,
    aaguid: userPasskey.aaguid,
  };
}
