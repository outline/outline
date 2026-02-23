import * as React from "react";
import { Trans } from "react-i18next";
import styled from "styled-components";
import { Backticks } from "@shared/components/Backticks";
import { richExtensions } from "@shared/editor/nodes";
import type { UnfurlResourceType, UnfurlResponse } from "@shared/types";
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
  Info,
} from "./Components";

type Props = Omit<UnfurlResponse[UnfurlResourceType.Project], "type">;

const HoverPreviewProject = React.forwardRef(function HoverPreviewProject_(
  { url, name, description, lead, state, progress, createdAt, targetDate }: Props,
  ref: React.Ref<HTMLDivElement>
) {
  const leadName = lead?.name;

  return (
    <Preview as="a" href={url} target="_blank" rel="noopener noreferrer">
      <Flex column ref={ref}>
        <Card fadeOut={false}>
          <CardContent>
            <Flex gap={2} column>
              <Title>
                <StateIndicator color={state.color} />
                <span>
                  <Backticks content={name} />
                </span>
              </Title>
              <Flex align="center" gap={6}>
                {lead && <Avatar src={lead.avatarUrl} size={18} />}
                <Info>
                  {lead ? (
                    <Trans>
                      {{ leadName }} leads • created{" "}
                      <Time dateTime={createdAt} addSuffix />
                    </Trans>
                  ) : (
                    <Trans>
                      Created <Time dateTime={createdAt} addSuffix />
                    </Trans>
                  )}
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

              <Flex column gap={4}>
                <Flex justify="space-between">
                  <Text type="secondary" size="small">
                    {state.name}
                  </Text>
                  <Text type="secondary" size="small">
                    {Math.round(progress * 100)}% complete
                  </Text>
                </Flex>
                <ProgressBarContainer>
                  <ProgressBarFill progress={progress} color={state.color} />
                </ProgressBarContainer>
                {targetDate && (
                  <Text type="tertiary" size="xsmall">
                    <Trans>
                      Target date: <Time dateTime={targetDate} />
                    </Trans>
                  </Text>
                )}
              </Flex>
            </Flex>
          </CardContent>
        </Card>
      </Flex>
    </Preview>
  );
});

const StateIndicator = styled.div<{ color: string }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: ${(props) => props.color};
  margin-top: 4px;
  flex-shrink: 0;
`;

const ProgressBarContainer = styled.div`
  width: 100%;
  height: 6px;
  background-color: ${(props) => props.theme.divider};
  border-radius: 3px;
  overflow: hidden;
`;

const ProgressBarFill = styled.div<{ progress: number; color: string }>`
  height: 100%;
  width: ${(props) => props.progress * 100}%;
  background-color: ${(props) => props.color};
  border-radius: 3px;
  transition: width 0.3s ease;
`;

export default HoverPreviewProject;
