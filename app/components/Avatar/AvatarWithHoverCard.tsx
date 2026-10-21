import { observer } from "mobx-react";
import { UserHoverCard } from "~/components/UserHoverCard";
import User from "~/models/User";
import type { AvatarProps } from "./Avatar";
import Avatar from "./Avatar";

/**
 * An avatar that additionally displays a profile card on hover when the model
 * it represents is a user.
 */
function AvatarWithHoverCard({
  showTooltip,
  showHoverCard = true,
  ref,
  ...props
}: AvatarProps) {
  const { model } = props;

  if (!showHoverCard || !(model instanceof User)) {
    return <Avatar ref={ref} showTooltip={showTooltip} {...props} />;
  }

  return (
    <UserHoverCard user={model}>
      <Avatar ref={ref} {...props} />
    </UserHoverCard>
  );
}

export default observer(AvatarWithHoverCard);
