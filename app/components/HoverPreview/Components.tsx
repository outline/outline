import { transparentize } from "polished";
import { Link } from "react-router-dom";
import styled, { css } from "styled-components";
import { s } from "@shared/styles";
import Text from "~/components/Text";
import Flex from "../Flex";

export const CARD_MARGIN = 10;

const NUMBER_OF_LINES = 10;

const sharedVars = css`
  --line-height: 1.6em;
`;

const StyledText = styled(Text)`
  margin-bottom: 0;
`;

export const Preview = styled(Link)`
  cursor: ${(props: { as?: string }) =>
    props.as === "div" ? "default" : "var(--pointer)"};
  border-radius: 4px;
  box-shadow: 0 30px 90px -20px rgba(0, 0, 0, 0.3),
    0 0 1px 1px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  position: absolute;
  min-width: 350px;
  max-width: 375px;
`;

export const Title = styled.h2`
  font-size: 1.25em;
  margin: 0;
  color: ${s("text")};
`;

export const Info = styled(StyledText).attrs(() => ({
  type: "tertiary",
  size: "xsmall",
}))`
  white-space: nowrap;
`;

export const Description = styled(StyledText)`
  ${sharedVars}
  margin-top: 0.5em;
  line-height: var(--line-height);
  max-height: calc(var(--line-height) * ${NUMBER_OF_LINES});
`;

export const Thumbnail = styled.img`
  object-fit: cover;
  height: 200px;
  background: ${s("menuBackground")};
`;

export const LabelContainer = styled(Flex)`
  margin-top: 1em;
  margin-bottom: 1em;
`;

export const Label = styled.div<{ color?: string }>`
  background-color: ${(props) =>
    props.color ? `#${props.color}` : props.theme.textTertiary};
  width: fit-content;
  border-radius: 12px;
  padding-left: 6px;
  padding-right: 6px;
  font-size: 0.9em;
  color: #fff;
  font-weight: 600;
  letter-spacing: -0.02em;
  margin-right: 0.3em;
  margin-top: 0.3em;
`;

export const MetaInfoContainer = styled(Flex)`
  margin-top: 1em;
`;

export const Status = styled(Label)<{ type: string }>`
  background-color: ${(props) =>
    props.type === "open" ? "#1f883d" : "#8250df"};
`;

export const CardContent = styled.div`
  overflow: hidden;
  user-select: none;
`;

// &:after — gradient mask for overflow text
export const Card = styled.div<{ fadeOut?: boolean; $borderRadius?: string }>`
  backdrop-filter: blur(10px);
  background: ${s("menuBackground")};
  padding: 16px;
  font-size: 0.9em;
  position: relative;

  .placeholder,
  .heading-anchor {
    display: none;
  }

  // fills the gap between the card and pointer to avoid a dead zone
  &::before {
    content: "";
    position: absolute;
    top: -10px;
    left: 0;
    right: 0;
    height: 10px;
  }

  ${(props) =>
    props.fadeOut !== false
      ? `&:after {
          ${sharedVars}
          content: "";
          display: block;
          position: absolute;
          pointer-events: none;
          background: linear-gradient(
            90deg,
            ${transparentize(1, props.theme.menuBackground)} 0%,
            ${transparentize(1, props.theme.menuBackground)} 75%,
            ${props.theme.menuBackground} 90%
          );
          bottom: 0;
          left: 0;
          right: 0;
          height: var(--line-height);
          border-bottom: 16px solid ${props.theme.menuBackground};
          border-bottom-left-radius: 4px;
          border-bottom-right-radius: 4px;
        }`
      : ""}
`;
