import Node from "./Node";

export default abstract class ReactNode extends Node {
  abstract component({
    node,
    isSelected,
    isEditable,
    innerRef,
  }): React.ReactElement;
}
