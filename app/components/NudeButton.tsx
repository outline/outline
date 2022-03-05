import * as React from "react";
import styled from "styled-components";
import { Action, ActionContext } from "~/types";

type Props = {
  width?: number;
  height?: number;
  size?: number;
  action?: Action;
  type?: "button" | "submit" | "reset";
  context?: ActionContext;
};

const NudeButton = React.forwardRef(
  (
    {
      action,
      context,
      ...rest
    }: Props & React.HTMLAttributes<HTMLButtonElement>,
    ref: React.Ref<HTMLButtonElement>
  ) => {
    if (context && action?.visible && !action.visible(context)) {
      return null;
    }

    return (
      <button
        {...rest}
        type={"type" in rest ? rest.type : "button"}
        ref={ref}
        onClick={
          action?.perform && context
            ? (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                action.perform?.(context);
              }
            : rest.onClick
        }
      />
    );
  }
);

const StyledNudeButton = styled(NudeButton)<Props>`
  width: ${(props) => props.width || props.size || 24}px;
  height: ${(props) => props.height || props.size || 24}px;
  background: none;
  border-radius: 4px;
  display: inline-block;
  line-height: 0;
  border: 0;
  padding: 0;
  cursor: pointer;
  user-select: none;
  color: inherit;
`;

export default StyledNudeButton;
