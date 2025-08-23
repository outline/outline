import * as React from "react";
import styled from "styled-components";
import { Backticks } from "@shared/components/Backticks";
import { Avatar } from "~/components/Avatar";
import Flex from "~/components/Flex";
import Text from "../Text";
import Time from "../Time";
import { Preview, Title, Card, CardContent } from "./Components";

type Props = {
  url: string;
  id: string;
  title: string;
  description?: string;
  author: {
    name: string;
    avatarUrl: string;
  };
  state: string | { name: string; color: string; draft?: boolean };
  createdAt: string;
  sourceBranch?: string;
  targetBranch?: string;
  repository?: string;
};

const HoverPreviewBitbucketPR = React.forwardRef(
  function _HoverPreviewBitbucketPR(
    {
      url,
      title,
      id,
      description,
      author,
      state,
      createdAt,
      sourceBranch,
      targetBranch,
      repository,
    }: Props,
    ref: React.Ref<HTMLDivElement>
  ) {
    return (
      <Preview as="a" href={url} target="_blank" rel="noopener noreferrer">
        <Flex column ref={ref}>
          <Card fadeOut={false}>
            <CardContent>
              <Flex gap={2} column>
                <Title>
                  <span>
                    <Text type="tertiary">#{id}</Text>&nbsp;
                    <Backticks content={title} />
                  </span>
                </Title>

                {/* Author and Status on same line */}
                <Flex align="center" justify="space-between">
                  <Flex align="center" gap={6}>
                    <Avatar src={author.avatarUrl} size={18} />
                    <Text>{author.name}</Text>
                  </Flex>
                  <StatusChip
                    state={typeof state === "string" ? { name: state } : state}
                  >
                    {typeof state === "string"
                      ? state
                      : state.draft
                        ? "DRAFT"
                        : state.name.toUpperCase()}
                  </StatusChip>
                </Flex>

                {/* Details Section */}
                <DetailsSection>
                  {/* Repository */}
                  {repository && (
                    <DetailRow>
                      <DetailLabel>Repository</DetailLabel>
                      <DetailValue>{repository}</DetailValue>
                    </DetailRow>
                  )}

                  {/* Source Branch */}
                  {sourceBranch && (
                    <DetailRow>
                      <DetailLabel>Source</DetailLabel>
                      <DetailValue>{sourceBranch}</DetailValue>
                    </DetailRow>
                  )}

                  {/* Target Branch */}
                  {targetBranch && (
                    <DetailRow>
                      <DetailLabel>Target</DetailLabel>
                      <DetailValue>{targetBranch}</DetailValue>
                    </DetailRow>
                  )}

                  {/* Creation time */}
                  <DetailRow>
                    <DetailLabel>Created</DetailLabel>
                    <DetailValue>
                      <Time dateTime={createdAt} addSuffix />
                    </DetailValue>
                  </DetailRow>
                </DetailsSection>

                {/* Description if available */}
                {description && (
                  <DescriptionSection>
                    <Text type="secondary" size="small">
                      {description}
                    </Text>
                  </DescriptionSection>
                )}
              </Flex>
            </CardContent>
          </Card>
        </Flex>
      </Preview>
    );
  }
);

const StatusChip = styled.span<{ state: { name: string; draft?: boolean } }>`
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: white;
  background: ${(props: { state: { name: string; draft?: boolean } }) => {
    if (props.state.draft) {
      return "#44546f"; // Draft color
    }

    switch (props.state.name.toLowerCase()) {
      case "open":
        return "#0c66e4"; // Open color
      case "merged":
        return "#1f845a"; // Merged color
      case "declined":
        return "#c9372c"; // Declined color
      default:
        return "#0c66e4"; // Default to open color
    }
  }};

  /* Dark theme inverse colors */
  @media (prefers-color-scheme: dark) {
    color: ${(props: { state: { name: string; draft?: boolean } }) => {
      if (props.state.draft) {
        return "#ffffff"; // White text for draft in dark theme
      }

      switch (props.state.name.toLowerCase()) {
        case "open":
          return "#ffffff"; // White text for open in dark theme
        case "merged":
          return "#ffffff"; // White text for merged in dark theme
        case "declined":
          return "#ffffff"; // White text for declined in dark theme
        default:
          return "#ffffff"; // White text for default in dark theme
      }
    }};
  }
`;

const DetailsSection = styled.div`
  margin-top: 12px;
`;

const DetailRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
`;

const DetailLabel = styled.span`
  color: #666;
  font-size: 12px;
`;

const DetailValue = styled.span`
  font-size: 12px;
  font-weight: 500;
  display: flex;
  align-items: center;
`;

const DescriptionSection = styled.div`
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
`;

export default HoverPreviewBitbucketPR;
