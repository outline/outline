import * as React from "react";
import { GroupIcon } from "outline-icons";
import { UnfurlResourceType, UnfurlResponse } from "@shared/types";
import { MAX_AVATAR_DISPLAY } from "@shared/constants";
import User from "~/models/User";
import Facepile from "~/components/Facepile";
import Flex from "~/components/Flex";
import { Preview, Title, Info, Card, CardContent } from "./Components";

type Props = Omit<UnfurlResponse[UnfurlResourceType.Group], "type">;

const HoverPreviewGroup = React.forwardRef(function _HoverPreviewGroup(
  { name, memberCount, members, overflow }: Props,
  ref: React.Ref<HTMLDivElement>
) {
  return (
    <Preview as="div">
      <Card fadeOut={false} ref={ref}>
        <CardContent>
          <Flex gap={12}>
            <Flex
              align="center"
              justify="center"
              style={{
                width: 48,
                height: 48,
                backgroundColor: "var(--background-secondary)",
                borderRadius: "50%",
              }}
            >
              <GroupIcon size={24} />
            </Flex>
            <Flex column gap={2} justify="center">
              <Title>{name}</Title>
              <Info>
                {memberCount === 1 ? "1 member" : `${memberCount} members`}
              </Info>
              {members.length > 0 && (
                <Flex align="center" gap={8}>
                  <Facepile
                    users={members.map(
                      (member, index) =>
                        ({
                          id: `group-member-${index}`,
                          name: member.name,
                          avatarUrl: member.avatarUrl,
                          color: member.color,
                          initial: member.name ? member.name[0] : "?",
                        }) as User
                    )}
                    overflow={overflow}
                    limit={MAX_AVATAR_DISPLAY}
                  />
                </Flex>
              )}
            </Flex>
          </Flex>
        </CardContent>
      </Card>
    </Preview>
  );
});

export default HoverPreviewGroup;
