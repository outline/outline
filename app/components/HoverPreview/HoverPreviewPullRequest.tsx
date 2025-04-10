import * as React from "react";
import { Trans } from "react-i18next";
import { UnfurlResourceType, UnfurlResponse } from "@shared/types";
import { Avatar } from "~/components/Avatar";
import Flex from "~/components/Flex";
import { PullRequestIcon } from "../Icons/PullRequestIcon";
import Text from "../Text";
import Time from "../Time";
import {
  Preview,
  Title,
  Description,
  Card,
  CardContent,
  Info,
} from "./Components";

type Props = Omit<UnfurlResponse[UnfurlResourceType.PR], "type">;

const HoverPreviewPullRequest = React.forwardRef(
  function _HoverPreviewPullRequest(
    { url, title, id, description, author, state, createdAt }: Props,
    ref: React.Ref<HTMLDivElement>
  ) {
    const authorName = author.name;

    return (
      <Preview as="a" href={url} target="_blank" rel="noopener noreferrer">
        <Flex column ref={ref}>
          <Card fadeOut={false}>
            <CardContent>
              <Flex gap={2} column>
                <Title>
                  <PullRequestIcon status={state.name} color={state.color} />
                  <span>
                    {title}&nbsp;<Text type="tertiary">{id}</Text>
                  </span>
                </Title>
                <Flex align="center" gap={4}>
                  <Avatar src={author.avatarUrl} />
                  <Info>
                    <Trans>
                      {{ authorName }} opened{" "}
                      <Time dateTime={createdAt} addSuffix />
                    </Trans>
                  </Info>
                </Flex>
                <Description>{description}</Description>
              </Flex>
            </CardContent>
          </Card>
        </Flex>
      </Preview>
    );
  }
);

export default HoverPreviewPullRequest;
