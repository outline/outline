import * as React from "react";
import styled from "styled-components";
import { Backticks } from "@shared/components/Backticks";
import { JiraIssueResponse } from "@shared/types";
import { Avatar } from "~/components/Avatar";
import Flex from "~/components/Flex";
import Text from "../Text";
import { Preview, Title, Card, CardContent } from "./Components";

type Props = Omit<JiraIssueResponse, "type"> & {
  issueTypeIconUrl?: string;
};

const HoverPreviewJiraIssue = React.forwardRef(function _HoverPreviewJiraIssue(
  { url, id, title, author, assignee, labels, state, issueTypeIconUrl }: Props,
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
                {issueTypeIconUrl && (
                  <IssueTypeIcon
                    src={issueTypeIconUrl}
                    alt="Issue Type"
                    onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                )}
                <span>
                  <Text type="tertiary">{id}</Text>&nbsp;
                  <Backticks content={title} />
                </span>
              </Title>

              {/* Assignee and Status on same line */}
              <Flex align="center" justify="space-between">
                <Flex align="center" gap={6}>
                  <Avatar
                    src={assignee?.avatarUrl || author.avatarUrl}
                    size={18}
                  />
                  <Text>{assignee?.name || authorName}</Text>
                </Flex>
                <StatusLabel color={state.color}>{state.name}</StatusLabel>
              </Flex>

              {/* Details Section */}
              <DetailsSection>
                {/* Priority */}
                {labels
                  .filter((label) => label.name.startsWith("Priority: "))
                  .map((label, index) => {
                    const displayText = label.name.replace("Priority: ", "");
                    return (
                      <DetailRow key={index}>
                        <DetailLabel>Priority</DetailLabel>
                        <DetailValue>
                          {label.iconUrl && (
                            <img
                              src={label.iconUrl}
                              alt={displayText}
                              style={{
                                width: "16px",
                                height: "16px",
                                marginRight: "4px",
                              }}
                              onError={(
                                e: React.SyntheticEvent<HTMLImageElement>
                              ) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          )}
                          {displayText}
                        </DetailValue>
                      </DetailRow>
                    );
                  })}

                {/* Custom Fields */}
                {labels
                  .filter(
                    (label) =>
                      label.name.includes(": ") &&
                      !label.name.startsWith("Priority: ")
                  )
                  .map((label, index) => {
                    const [fieldLabel, fieldValue] = label.name.split(": ");
                    return (
                      <DetailRow key={index}>
                        <DetailLabel>{fieldLabel}</DetailLabel>
                        <DetailValue>{fieldValue}</DetailValue>
                      </DetailRow>
                    );
                  })}
              </DetailsSection>
            </Flex>
          </CardContent>
        </Card>
      </Flex>
    </Preview>
  );
});

const IssueTypeIcon = styled.img`
  width: 18px;
  height: 18px;
  margin-right: 8px;
  margin-top: 2px;
`;

const StatusLabel = styled.div<{ color: string }>`
  background-color: ${(props) => props.color};
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
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

export default HoverPreviewJiraIssue;
