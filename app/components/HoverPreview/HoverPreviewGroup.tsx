import * as React from "react";
import { UnfurlResourceType, UnfurlResponse } from "@shared/types";
import { MAX_AVATAR_DISPLAY } from "@shared/constants";
import User from "~/models/User";
import Facepile from "~/components/Facepile";
import Flex from "~/components/Flex";
import {
  Preview,
  Title,
  Info,
  Card,
  CardContent,
  Description,
} from "./Components";
import ErrorBoundary from "../ErrorBoundary";

type Props = Omit<UnfurlResponse[UnfurlResourceType.Group], "type">;

const HoverPreviewGroup = React.forwardRef(function _HoverPreviewGroup(
  { name, memberCount, users }: Props,
  ref: React.Ref<HTMLDivElement>
) {
  return (
    <Preview as="div">
      <Card fadeOut={false} ref={ref}>
        <CardContent>
          <ErrorBoundary showTitle={false} reloadOnChunkMissing={false}>
            <Flex column gap={2} align="start">
              <Title>{name}</Title>
              <Info>
                {memberCount === 1 ? "1 member" : `${memberCount} members`}
              </Info>
              {users.length > 0 && (
                <Description>
                  <Facepile
                    users={users.map(
                      (member) =>
                        ({
                          id: member.id,
                          name: member.name,
                          avatarUrl: member.avatarUrl,
                          color: member.color,
                          initial: member.name ? member.name[0] : "?",
                        }) as User
                    )}
                    overflow={Math.max(0, memberCount - users.length)}
                    limit={MAX_AVATAR_DISPLAY}
                  />
                </Description>
              )}
            </Flex>
          </ErrorBoundary>
        </CardContent>
      </Card>
    </Preview>
  );
});

export default HoverPreviewGroup;
