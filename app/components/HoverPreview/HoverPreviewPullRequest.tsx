import * as React from "react";
import { Trans } from "react-i18next";
import Flex from "~/components/Flex";
import Avatar from "../Avatar";
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

type Props = {
  /** Pull request url */
  url: string;
  /** Pull request title */
  title: string;
  /** Pull request description */
  description: string;
  /** When the pull request was opened */
  createdAt: string;
  /** Author of the pull request */
  author: { name: string; avatarUrl: string };
  /** Pull request status */
  status: { name: string; color: string };
  /** Pull request identifier */
  identifier: string;
};

const HoverPreviewPullRequest = React.forwardRef(
  function _HoverPreviewPullRequest(
    { url, title, identifier, description, author, status, createdAt }: Props,
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
                  <PullRequestIcon status={status.name} color={status.color} />
                  <span>
                    {title}&nbsp;<Text type="tertiary">{identifier}</Text>
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
