import * as React from "react";
import { ComponentProps } from "../types";

export function MentionUser(props: ComponentProps) {
  const { isSelected, node, isEditable, children, onChangeSize } = props;

  return (
    <span className={isSelected ? `ProseMirror-selectednode` : undefined}>
      @{node.attrs.label}
    </span>
  );
}

export function MentionDocument(props: ComponentProps) {
  const { isSelected, node, isEditable, children, onChangeSize } = props;

  return (
    <a
      className={isSelected ? `ProseMirror-selectednode` : undefined}
      href={`/doc/${node.attrs.modelId}`}
    >
      +{node.attrs.label}
    </a>
  );
}
