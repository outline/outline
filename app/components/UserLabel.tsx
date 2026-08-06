import { observer } from "mobx-react";
import type * as React from "react";
import Text from "@shared/components/Text";
import Avatar, { AvatarSize } from "~/components/Avatar/Avatar";
import { HStack } from "~/components/primitives/HStack";
import { UserHoverCard } from "~/components/UserHoverCard";
import type User from "~/models/User";

type Props = {
  /** The user to display, nothing is rendered when undefined. */
  user: User | null | undefined;
  /** Whether the user is the primary content of the row, shown with a larger avatar. */
  primary?: boolean;
  /** Additional content displayed after the user's name. */
  children?: React.ReactNode;
};

/**
 * Displays a user's avatar alongside their name, with a card summarizing their
 * profile shown on hover.
 */
export const UserLabel = observer(function UserLabel_({
  user,
  primary,
  children,
}: Props) {
  if (!user) {
    return null;
  }

  return (
    <UserHoverCard user={user}>
      <HStack>
        <Avatar
          model={user}
          size={primary ? AvatarSize.Large : AvatarSize.Small}
        />
        <Text selectable ellipsis>
          {user.name}
        </Text>
        {children}
      </HStack>
    </UserHoverCard>
  );
});
