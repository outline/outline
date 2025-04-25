import * as React from "react";
import { useTheme } from "styled-components";
import { isSafari } from "../../utils/browser";
import { BaseIconProps } from ".";

enum StateType {
  Triage = "triage",
  Backlog = "backlog",
  Unstarted = "unstarted",
  Started = "started",
  Completed = "completed",
  Canceled = "canceled",
}

export function LinearIssueStatusIcon(props: BaseIconProps) {
  const theme = useTheme();
  const { state, size = 16 } = props;
  const percentage =
    state.type === StateType.Triage ||
    state.type === StateType.Backlog ||
    state.type === StateType.Unstarted
      ? 0
      : state.type === StateType.Started
      ? state.completionPercentage ?? 0.5
      : 1;
  const isTriage = state.type === StateType.Triage;
  const isBacklog = state.type === StateType.Backlog;
  const isCompleted = state.type === StateType.Completed;
  // Due to some rendering issues and differences between browsers, the logical constant 4 in the rendering below
  // needs to be a bit less to make 50% look like half a circle.
  const magicFour = isSafari() ? 3.895 : 3.98;

  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <circle
        cx={7}
        cy={7}
        r={isTriage ? 3.5 : 6}
        fill="none"
        stroke={state.color}
        strokeWidth={isTriage ? 7 : 1.5}
        strokeDasharray={isTriage ? "2 0" : isBacklog ? "1.4 1.74" : "3.14 0"}
        strokeDashoffset={isTriage ? 3.2 : isBacklog ? 0.65 : -0.7}
      />
      <circle
        cx={7}
        cy={7}
        r={percentage === 1 ? 3 : 2}
        fill="none"
        stroke={state.color}
        strokeWidth={percentage === 1 ? 6 : 4}
        strokeDasharray={`${
          percentage * Math.PI * (percentage === 1 ? 6 : magicFour)
        } 100`}
        strokeDashoffset={0}
        transform={`rotate(-90 7 7)`}
      />
      {(isTriage || percentage === 1) && (
        <path
          className="icon"
          stroke="none"
          d={isTriage ? triageIcon : isCompleted ? checkMarkIcon : closeIcon}
          fill={theme.background}
        />
      )}
    </svg>
  );
}

const checkMarkIcon =
  "M10.951 4.24896C11.283 4.58091 11.283 5.11909 10.951 5.45104L5.95104 10.451C5.61909 10.783 5.0809 10.783 4.74896 10.451L2.74896 8.45104C2.41701 8.11909 2.41701 7.5809 2.74896 7.24896C3.0809 6.91701 3.61909 6.91701 3.95104 7.24896L5.35 8.64792L9.74896 4.24896C10.0809 3.91701 10.6191 3.91701 10.951 4.24896Z";
const triageIcon =
  "M8.0126 7.98223V9.50781C8.0126 9.92901 8.52329 10.1548 8.85102 9.87854L11.8258 7.37066C12.0581 7.17486 12.0581 6.82507 11.8258 6.62927L8.85102 4.12139C8.52329 3.84509 8.0126 4.07092 8.0126 4.49212V6.01763H5.98739V4.49218C5.98739 4.07098 5.4767 3.84515 5.14897 4.12146L2.17419 6.62933C1.94194 6.82513 1.94194 7.17492 2.17419 7.37072L5.14897 9.8786C5.4767 10.1549 5.98739 9.92907 5.98739 9.50787V7.98223H8.0126Z";
const closeIcon =
  "M3.73657 3.73657C4.05199 3.42114 4.56339 3.42114 4.87881 3.73657L5.93941 4.79716L7 5.85775L9.12117 3.73657C9.4366 3.42114 9.94801 3.42114 10.2634 3.73657C10.5789 4.05199 10.5789 4.56339 10.2634 4.87881L8.14225 7L10.2634 9.12118C10.5789 9.4366 10.5789 9.94801 10.2634 10.2634C9.94801 10.5789 9.4366 10.5789 9.12117 10.2634L7 8.14225L4.87881 10.2634C4.56339 10.5789 4.05199 10.5789 3.73657 10.2634C3.42114 9.94801 3.42114 9.4366 3.73657 9.12118L4.79716 8.06059L5.85775 7L3.73657 4.87881C3.42114 4.56339 3.42114 4.05199 3.73657 3.73657Z";
