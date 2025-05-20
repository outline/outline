import { useState } from "react";
import styled from "styled-components";
import { fadeIn } from "~/styles/animations";

/**
 * Fade in animation for a component.
 *
 * @param timing - The duration of the fade in animation, default is 250ms.
 */
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
  const [isAnimated] = useState(animate);
  return isAnimated ? <Fade>{children}</Fade> : <>{children}</>;
};

export default Fade;
