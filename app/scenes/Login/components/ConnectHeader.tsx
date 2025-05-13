import { MoreIcon } from "outline-icons";
import * as React from "react";
import Flex from "@shared/components/Flex";
import Text from "@shared/components/Text";
import type Team from "~/models/Team";
import type OAuthClient from "~/models/oauth/OAuthClient";
import { Avatar } from "~/components/Avatar";
import { AvatarSize, AvatarVariant } from "~/components/Avatar/Avatar";

type Props = {
  team: Team;
  oauthClient: OAuthClient;
};

export function ConnectHeader({ team, oauthClient }: Props) {
  return (
    <Text type="tertiary">
      <Flex gap={12} align="center">
        <Avatar
          variant={AvatarVariant.Square}
          model={{
            avatarUrl: oauthClient.avatarUrl,
            initial: oauthClient.name[0],
          }}
          size={AvatarSize.XXLarge}
          alt={oauthClient.name}
        />

        <MoreIcon />

        <Avatar
          variant={AvatarVariant.Square}
          model={team}
          size={AvatarSize.XXLarge}
          alt={team.name}
        />
      </Flex>
    </Text>
  );
}
