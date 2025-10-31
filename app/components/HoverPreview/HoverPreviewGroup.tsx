import * as React from "react";
import { useTranslation } from "react-i18next";
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
  { name, description, memberCount, users }: Props,
  ref: React.Ref<HTMLDivElement>
) {
  const { t } = useTranslation();

  return (
    <Preview as="div">
      <Card fadeOut={false} ref={ref}>
        <CardContent>
          <ErrorBoundary showTitle={false} reloadOnChunkMissing={false}>
            <Flex column gap={2} align="start">
              <Flex
                justify="space-between"
                gap={4}
                style={{ width: "100%" }}
                auto
              >
                <Flex column align="start">
                  <Title>{name}</Title>
                  <Info>
                    {t("{{ count }} members", { count: memberCount })}
                  </Info>
                </Flex>
                {users.length > 0 && (
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
                )}
              </Flex>
              {description && <Description>{description}</Description>}
            </Flex>
          </ErrorBoundary>
        </CardContent>
      </Card>
    </Preview>
  );
});

export default HoverPreviewGroup;
