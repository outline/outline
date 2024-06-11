import * as React from "react";
import { cn } from "../styles/utils";
import { ComponentProps } from "../types";

export function MentionUser(props: ComponentProps) {
  const { isSelected, stores, node } = props;
  const user = stores.users.get(node.attrs.modelId);

  return (
    <span
      className={cn({
        "ProseMirror-selectednode": isSelected,
        "use-hover-preview": true,
        mention: true,
      })}
    >
      @{user?.name || node.attrs.label}
    </span>
  );
}

export function MentionDocument(props: ComponentProps) {
  const { isSelected, stores, node } = props;
  const doc = stores.documents.get(node.attrs.modelId);

  return (
    <a
      className={cn({
        "ProseMirror-selectednode": isSelected,
        "use-hover-preview": true,
        mention: true,
      })}
      href={`/doc/${node.attrs.modelId}`}
    >
      {doc?.emoji || "+"} {doc?.title || node.attrs.label}
    </a>
  );
}
