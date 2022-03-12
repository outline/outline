import styled from "styled-components";
import ActionButton, {
  Props as ActionButtonProps,
} from "~/components/ActionButton";

type Props = ActionButtonProps & {
  width?: number;
  height?: number;
  size?: number;
  type?: "button" | "submit" | "reset";
};

const StyledNudeButton = styled(ActionButton).attrs((props: Props) => ({
  type: "type" in props ? props.type : "button",
}))<Props>`
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
