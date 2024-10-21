import * as React from "react";
import { UnfurlResourceType, UnfurlResponse } from "@shared/types";
import { Avatar, AvatarSize } from "~/components/Avatar";
import Flex from "~/components/Flex";
import { Preview, Title, Info, Card, CardContent } from "./Components";

type Props = Omit<UnfurlResponse[UnfurlResourceType.Mention], "type">;

const HoverPreviewMention = React.forwardRef(function _HoverPreviewMention(
  { avatarUrl, name, lastActive, color, email }: Props,
  ref: React.Ref<HTMLDivElement>
) {
  return (
    <Preview as="div">
      <Card fadeOut={false} ref={ref}>
        <CardContent>
          <Flex gap={12}>
            <Avatar
              model={{
                avatarUrl,
                initial: name ? name[0] : "?",
                color,
              }}
              size={AvatarSize.XLarge}
            />
            <Flex column gap={2} justify="center">
              <Title>{name}</Title>
              {email && <Info>{email}</Info>}
              <Info>{lastActive}</Info>
            </Flex>
          </Flex>
        </CardContent>
      </Card>
    </Preview>
  );
});

export default HoverPreviewMention;
