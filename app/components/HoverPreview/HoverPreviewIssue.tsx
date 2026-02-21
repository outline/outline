import * as React from "react";
import { Trans } from "react-i18next";
import styled from "styled-components";
import { Backticks } from "@shared/components/Backticks";
import { IssueStatusIcon } from "@shared/components/IssueStatusIcon";
import { richExtensions } from "@shared/editor/nodes";
import type { UnfurlResourceType, UnfurlResponse } from "@shared/types";
import { IntegrationService } from "@shared/types";
import { Avatar } from "~/components/Avatar";
import Editor from "~/components/Editor";
import Flex from "~/components/Flex";
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

const HoverPreviewIssue = React.forwardRef(function HoverPreviewIssue_(
  { url, id, title, description, author, labels, state, createdAt }: Props,
  ref: React.Ref<HTMLDivElement>
) {
  const authorName = author.name;
  const urlObj = new URL(url);
  const service =
    urlObj.hostname === "linear.app"
      ? IntegrationService.Linear
      : urlObj.hostname === "github.com"
        ? IntegrationService.GitHub
        : IntegrationService.GitLab;

  return (
    <Preview as="a" href={url} target="_blank" rel="noopener noreferrer">
      <Flex column ref={ref}>
        <Card fadeOut={false}>
          <CardContent>
            <Flex gap={2} column>
              <Title>
                <StyledIssueStatusIcon
                  service={service}
                  state={state}
                  size={18}
                />
                <span>
                  <Backticks content={title} />
                  &nbsp;<Text type="tertiary">{id}</Text>
                </span>
              </Title>
              <Flex align="center" gap={6}>
                <Avatar src={author.avatarUrl} size={18} />
                <Info>
                  <Trans>
                    {{ authorName }} created{" "}
                    <Time dateTime={createdAt} addSuffix />
                  </Trans>
                </Info>
              </Flex>
              {description && (
                <Description as="div">
                  <React.Suspense fallback={<div />}>
                    <Editor
                      extensions={richExtensions}
                      defaultValue={description}
                      embedsDisabled
                      readOnly
                    />
                  </React.Suspense>
                </Description>
              )}

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

const StyledIssueStatusIcon = styled(IssueStatusIcon)`
  margin-top: 2px;
`;

export default HoverPreviewIssue;
