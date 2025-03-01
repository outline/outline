import React from "react";
import styled from "styled-components";
import { fadeIn } from "~/styles/animations";

const Fade = styled.span<{ timing?: number | string }>`
  animation: ${fadeIn} ${(props) => props.timing || "250ms"} ease-in-out;
`;

type Props = {
  children?: JSX.Element | null;
  /** If true, children will be animated. */
  animate: boolean;
};

/**
 * Wraps children in a <Fade> if loading is true on mount.
 */
export const ConditionalFade = ({ animate, children }: Props) => {
  const [isAnimated] = React.useState(animate);

  return isAnimated ? <Fade>{children}</Fade> : <>{children}</>;
};

export default Fade;
