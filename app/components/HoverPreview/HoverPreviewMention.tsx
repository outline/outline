import * as React from "react";
import Avatar from "~/components/Avatar";
import { AvatarSize } from "~/components/Avatar/Avatar";
import Flex from "~/components/Flex";
import { Preview, Title, Description } from "./Components";

type Props = {
  /** Resource url, avatar url in case of user mention */
  url: string;
  /** Title for the preview card*/
  title: string;
  /** Description about mentioned user's recent activity */
  description: string;
  /** Used for avatar's background color in absence of avatar url */
  color: string;
};

function HoverPreviewMention({ url, title, description, color }: Props) {
  return (
    <Preview to="">
      <Flex gap={12}>
        <Avatar
          model={{
            avatarUrl: url,
            initial: title ? title[0] : "?",
            color,
          }}
          size={AvatarSize.XLarge}
        />
        <Flex column>
          <Title>{title}</Title>
          <Description type="tertiary" size="xsmall">
            {description}
          </Description>
        </Flex>
      </Flex>
    </Preview>
  );
}

export default HoverPreviewMention;
