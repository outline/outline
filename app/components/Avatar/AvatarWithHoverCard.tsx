import { observer } from "mobx-react";
import * as React from "react";
import { UserHoverCard } from "~/components/UserHoverCard";
import User from "~/models/User";
import type { AvatarProps } from "./Avatar";
import Avatar from "./Avatar";

/**
 * An avatar that additionally displays a profile card on hover when the model
 * it represents is a user.
 */
const AvatarWithHoverCard = React.forwardRef(function AvatarWithHoverCard_(
  { showTooltip, showHoverCard = true, ...props }: AvatarProps,
  ref: React.Ref<HTMLDivElement>
) {
  const { model } = props;

  if (!showHoverCard || !(model instanceof User)) {
    return <Avatar ref={ref} showTooltip={showTooltip} {...props} />;
  }

  return (
    <UserHoverCard user={model}>
      <Avatar ref={ref} {...props} />
    </UserHoverCard>
  );
});

export default observer(AvatarWithHoverCard);
