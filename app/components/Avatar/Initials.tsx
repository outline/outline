import { getLuminance } from "polished";
import styled from "styled-components";
import { s } from "@shared/styles";
import Flex from "~/components/Flex";

const Initials = styled(Flex)<{
  /** The color of the background, defaults to textTertiary. */
  color?: string;
  /** Content is only used to calculate font size, use children to render. */
  content?: string;
  /** The size of the avatar */
  size: number;
}>`
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: ${(props) =>
    getLuminance(props.color ?? props.theme.textTertiary) > 0.5
      ? s("black50")
      : s("white75")};
  background-color: ${(props) => props.color ?? props.theme.textTertiary};
  width: ${(props) => props.size}px;
  height: ${(props) => props.size}px;
  flex-shrink: 0;

  // adjust font size down for each additional character
  font-size: ${(props) => props.size / 2 - (props.content?.length ?? 0)}px;
  font-weight: 500;
`;

export default Initials;
