import * as React from "react";
import Avatar from "~/components/Avatar";
import { AvatarSize } from "~/components/Avatar/Avatar";
import Flex from "~/components/Flex";
import { Preview, Title, Info, Card, CardContent } from "./Components";

type Props = {
  /** Resource url, avatar url in case of user mention */
  url: string;
  /** Title for the preview card*/
  title: string;
  /** Info about mentioned user's recent activity */
  info: string;
  /** Used for avatar's background color in absence of avatar url */
  color: string;
};

const HoverPreviewMention = React.forwardRef(function _HoverPreviewMention(
  { url, title, info, color }: Props,
  ref: React.Ref<HTMLDivElement>
) {
  return (
    <Preview as="div">
      <Card fadeOut={false} ref={ref}>
        <CardContent>
          <Flex gap={12}>
            <Avatar
              model={{
                avatarUrl: url,
                initial: title ? title[0] : "?",
                color,
              }}
              size={AvatarSize.XLarge}
            />
            <Flex column gap={2} justify="center">
              <Title>{title}</Title>
              <Info>{info}</Info>
            </Flex>
          </Flex>
        </CardContent>
      </Card>
    </Preview>
  );
});

export default HoverPreviewMention;
