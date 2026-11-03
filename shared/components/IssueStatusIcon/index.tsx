import * as React from "react";
import styled from "styled-components";
import type { UnfurlResourceType, UnfurlResponse } from "../../types";
import { DefaultIssueStatusIcon } from "./DefaultIssueStatusIcon";
import { WorkflowStatusIcon } from "./WorkflowStatusIcon";

export type BaseIconProps = {
  state: UnfurlResponse[UnfurlResourceType.Issue]["state"];
  className?: string;
  size?: number;
};

/**
 * Renders the status icon of an issue. Issues with a workflow state type show
 * its progress, others show whether they are open or closed.
 *
 * @param props the issue state and display options.
 * @returns the icon.
 */
export function IssueStatusIcon(props: BaseIconProps) {
  return (
    <Icon size={props.size} className={props.className}>
      {props.state.type ? (
        <WorkflowStatusIcon {...props} />
      ) : (
        <DefaultIssueStatusIcon {...props} />
      )}
    </Icon>
  );
}

const Icon = styled.span<{ size?: number }>`
  display: inline-flex;
  flex-shrink: 0;
  width: ${(props) => props.size ?? 24}px;
  height: ${(props) => props.size ?? 24}px;
  align-items: center;
  justify-content: center;
`;
