import * as React from "react";
import styled from "styled-components";

type Props = {
  status: string;
  color: string;
  size?: number;
  className?: string;
};

/**
 * Issue status icon based on GitHub issue status, but can be used for any git-style integration.
 */
export function IssueStatusIcon({ size, ...rest }: Props) {
  return (
    <Icon size={size}>
      <BaseIcon {...rest} />
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

function BaseIcon(props: Props) {
  switch (props.status) {
    case "open":
      return (
        <svg
          viewBox="0 0 16 16"
          width="16"
          height="16"
          fill={props.color}
          className={props.className}
        >
          <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
          <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z" />
        </svg>
      );
    case "closed":
      return (
        <svg
          viewBox="0 0 16 16"
          width="16"
          height="16"
          fill={props.color}
          className={props.className}
        >
          <path d="M11.28 6.78a.75.75 0 0 0-1.06-1.06L7.25 8.69 5.78 7.22a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l3.5-3.5Z" />
          <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0Zm-1.5 0a6.5 6.5 0 1 0-13 0 6.5 6.5 0 0 0 13 0Z" />
        </svg>
      );
    case "canceled":
      return (
        <svg
          viewBox="0 0 16 16"
          width="16"
          height="16"
          fill={props.color}
          className={props.className}
        >
          <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Zm9.78-2.22-5.5 5.5a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734l5.5-5.5a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042Z" />
        </svg>
      );
    default:
      return null;
  }
}
