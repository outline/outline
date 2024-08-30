import * as React from "react";
import { Trans } from "react-i18next";
import { UnfurlResourceType, UnfurlResponse } from "@shared/types";
import { Avatar } from "~/components/Avatar";
import Flex from "~/components/Flex";
import { IssueStatusIcon } from "../Icons/IssueStatusIcon";
import Text from "../Text";
import Time from "../Time";
import {
  Preview,
  Title,
  Description,
  Card,
  CardContent,
  Label,
  Info,
} from "./Components";

type Props = Omit<UnfurlResponse[UnfurlResourceType.Issue], "type">;

const HoverPreviewIssue = React.forwardRef(function _HoverPreviewIssue(
  { url, id, title, description, author, labels, state, createdAt }: Props,
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
                <IssueStatusIcon status={state.name} color={state.color} />
                <span>
                  {title}&nbsp;<Text type="tertiary">{id}</Text>
                </span>
              </Title>
              <Flex align="center" gap={4}>
                <Avatar src={author.avatarUrl} />
                <Info>
                  <Trans>
                    {{ authorName }} created{" "}
                    <Time dateTime={createdAt} addSuffix />
                  </Trans>
                </Info>
              </Flex>
              <Description>{description}</Description>

              <Flex wrap>
                {labels.map((label, index) => (
                  <Label key={index} color={label.color}>
                    {label.name}
                  </Label>
                ))}
              </Flex>
            </Flex>
          </CardContent>
        </Card>
      </Flex>
    </Preview>
  );
});

export default HoverPreviewIssue;
