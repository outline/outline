import * as React from "react";
import styled from "styled-components";
import type { UnfurlResourceType, UnfurlResponse } from "../../types";
import { DefaultIssueStatusIcon } from "./DefaultIssueStatusIcon";

export type BaseIconProps = {
  state: UnfurlResponse[UnfurlResourceType.Issue]["state"];
  className?: string;
  size?: number;
};

/** Returns the status icon registered for an issue, if any. */
export type IssueStatusIconResolver = (issue: {
  service?: string;
  url: string;
}) => React.ComponentType<BaseIconProps> | undefined;

type Props = BaseIconProps & {
  /** The icon to render, the default icon is used when not given. */
  icon?: React.ComponentType<BaseIconProps>;
};

/**
 * Renders the status icon of an issue.
 *
 * @param props the issue state, icon and display options.
 * @returns the icon.
 */
export function IssueStatusIcon({ icon, ...props }: Props) {
  return (
    <Icon size={props.size} className={props.className}>
      {React.createElement(icon ?? DefaultIssueStatusIcon, props)}
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
