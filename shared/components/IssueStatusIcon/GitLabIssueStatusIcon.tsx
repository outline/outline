import * as React from "react";
import { isSafari } from "../../utils/browser";
import { BaseIconProps } from ".";

/** Renders an icon for a specific GitLab issue state */
export function GitLabIssueStatusIcon(props: BaseIconProps) {
  // No theme needed for this component
  const { state } = props;
  const isOpen = state.name === "opened";
  const color = state.color || (isOpen ? "#1aaa55" : "#db3b21"); // Green for open, red for closed

  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ marginTop: isSafari() ? 0 : -2 }}
    >
      <circle cx="8" cy="8" r="7" stroke={color} strokeWidth="2" fill="none" />
      {!isOpen && (
        <path
          d="M4.5 4.5L11.5 11.5M4.5 11.5L11.5 4.5"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}
      {state.draft && (
        <rect x="4" y="7" width="8" height="2" rx="1" fill={color} />
      )}
    </svg>
  );
}
