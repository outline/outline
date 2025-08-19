import * as React from "react";
import { BaseIconProps } from ".";

export function GitLabIssueStatusIcon(props: BaseIconProps) {
  const { state, className, size = 16 } = props;
  const isOpen = state.name === "opened";
  const color = state.color || (isOpen ? "#1aaa55" : "#db3b21"); // Green for open, red for closed

  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="none"
      className={className}
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
      {"draft" in state && state.draft && (
        <rect x="4" y="7" width="8" height="2" rx="1" fill={color} />
      )}
    </svg>
  );
}
