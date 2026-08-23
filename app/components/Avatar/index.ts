import type { AvatarProps, IAvatar } from "./Avatar";
import { AvatarSize, AvatarVariant } from "./Avatar";
import AvatarWithHoverCard from "./AvatarWithHoverCard";
import AvatarWithPresence from "./AvatarWithPresence";
import { GroupAvatar } from "./GroupAvatar";

/**
 * The default avatar, which shows a profile card on hover for users.
 */
const Avatar = AvatarWithHoverCard;

export { Avatar, GroupAvatar, AvatarSize, AvatarVariant, AvatarWithPresence };

export type { AvatarProps, IAvatar };
