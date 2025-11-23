import * as React from "react";
import styled from "styled-components";
import NudeButton from "./NudeButton";
import { hover, s } from "@shared/styles";

type Props = React.HTMLAttributes<HTMLButtonElement> & {
  /** The current color value in hex format. If no color is passed a radial gradient will be shown */
  color?: string;
  /** Whether the button is currently active/selected */
  active?: boolean;
  /** The size of the button in pixels */
  size?: number;
};

export const ColorButton = React.forwardRef(
  (
    { color, active = false, size = 24, ...rest }: Props,
    ref: React.Ref<HTMLButtonElement>
  ) => (
    <ColorButtonInternal
      $active={active}
      $size={size}
      {...rest}
      style={{ "--color": color, ...rest.style } as React.CSSProperties}
      ref={ref}
    >
      <Selected />
    </ColorButtonInternal>
  )
);

const Selected = styled.span`
  width: 10px;
  height: 5px;
  border-left: 2px solid white;
  border-bottom: 2px solid white;
  transform: translateY(-25%) rotate(-45deg);
`;

const ColorButtonInternal = styled(NudeButton)<{
  $active: boolean;
  $size: number;
}>`
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 50%;
  background: var(
    --color,
    linear-gradient(135deg, #ff5858 0%, #fbcc34 50%, #00c6ff 100%)
  );

  &: ${hover} {
    outline: 2px solid ${s("menuBackground")} !important;
    box-shadow: 0px 0px 3px 3px var(--color);
  }

  & ${Selected} {
    display: ${({ $active }) => ($active ? "block" : "none")};
  }
`;
