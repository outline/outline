import * as React from "react";
import styled from "styled-components";
import {
  IntegrationService,
  IssueTrackerIntegrationService,
  UnfurlResourceType,
  UnfurlResponse,
} from "../../types";
import { GitHubIssueStatusIcon } from "./GitHubIssueStatusIcon";
import { LinearIssueStatusIcon } from "./LinearIssueStatusIcon";

export type BaseIconProps = {
  state: UnfurlResponse[UnfurlResourceType.Issue]["state"];
  className?: string;
  size?: number;
};

type Props = BaseIconProps & {
  service: IssueTrackerIntegrationService;
};

export function IssueStatusIcon(props: Props) {
  return (
    <Icon size={props.size} className={props.className}>
      {getIcon(props)}
    </Icon>
  );
}

function getIcon(props: Props) {
  switch (props.service) {
    case IntegrationService.GitHub:
      return <GitHubIssueStatusIcon {...props} />;
    case IntegrationService.Linear:
      return <LinearIssueStatusIcon {...props} />;
  }
}

const Icon = styled.span<{ size?: number }>`
  display: inline-flex;
  flex-shrink: 0;
  width: ${(props) => props.size ?? 24}px;
  height: ${(props) => props.size ?? 24}px;
  align-items: center;
  justify-content: center;
`;
