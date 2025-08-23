import * as React from "react";
import styled from "styled-components";
import { UnfurlResourceType, UnfurlResponse } from "../types";

type Props = {
  state: UnfurlResponse[UnfurlResourceType.PR]["state"];
  size?: number;
  className?: string;
};

/**
 * Bitbucket pull request icon using the UXWing Bitbucket icon
 */
export function BitbucketPullRequestIcon({ size, className, state }: Props) {
  return (
    <Icon size={size} className={className}>
      <BaseIcon state={state} />
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

function BaseIcon({ state }: Pick<Props, "state">) {
  // Get the appropriate color based on state and theme
  const getStatusColor = () => {
    if (state.draft) {
      return "#44546f"; // Draft color
    }

    switch (state.name.toLowerCase()) {
      case "open":
        return "#0c66e4"; // Open color
      case "merged":
        return "#1f845a"; // Merged color
      case "declined":
        return "#c9372c"; // Declined color
      default:
        return "#0c66e4"; // Default to open color
    }
  };

  return (
    <svg
      viewBox="0 0 24 24"
      fill={getStatusColor()}
      style={{ width: "100%", height: "100%" }}
    >
      <path d="M.778 1.213a.768.768 0 00-.768.892l3.263 19.81c.084.5.515.868 1.022.873H19.26a.772.772 0 00.77-.646l3.27-20.03a.774.774 0 00-.768-.891zM14.52 15.53H9.522L8.17 8.466h7.561z" />
    </svg>
  );
}
