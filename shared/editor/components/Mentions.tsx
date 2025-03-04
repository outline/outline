import { observer } from "mobx-react";
import { DocumentIcon, EmailIcon, CollectionIcon } from "outline-icons";
import { Node } from "prosemirror-model";
import * as React from "react";
import { Link } from "react-router-dom";
import Icon from "../../components/Icon";
import useStores from "../../hooks/useStores";
import { cn } from "../styles/utils";
import { ComponentProps } from "../types";

const getAttributesFromNode = (node: Node) => {
  const spec = node.type.spec.toDOM?.(node) as any as Record<string, string>[];
  const { class: className, ...attrs } = spec[1];
  return { className, ...attrs };
};

export const MentionUser = observer(function MentionUser_(
  props: ComponentProps
) {
  const { isSelected, node } = props;
  const { users } = useStores();
  const user = users.get(node.attrs.modelId);
  const { className, ...attrs } = getAttributesFromNode(node);

  return (
    <span
      {...attrs}
      className={cn(className, {
        "ProseMirror-selectednode": isSelected,
      })}
    >
      <EmailIcon size={18} />
      {user?.name || node.attrs.label}
    </span>
  );
});

export const MentionDocument = observer(function MentionDocument_(
  props: ComponentProps
) {
  const { isSelected, node } = props;
  const { documents } = useStores();
  const doc = documents.get(node.attrs.modelId);
  const modelId = node.attrs.modelId;
  const { className, ...attrs } = getAttributesFromNode(node);

  React.useEffect(() => {
    if (modelId) {
      void documents.prefetchDocument(modelId);
    }
  }, [modelId, documents]);

  return (
    <Link
      {...attrs}
      className={cn(className, {
        "ProseMirror-selectednode": isSelected,
      })}
      to={doc?.path ?? `/doc/${node.attrs.modelId}`}
    >
      {doc?.icon ? (
        <Icon value={doc?.icon} color={doc?.color} size={18} />
      ) : (
        <DocumentIcon size={18} />
      )}
      {doc?.title || node.attrs.label}
    </Link>
  );
});

export const MentionCollection = observer(function MentionCollection_(
  props: ComponentProps
) {
  const { isSelected, node } = props;
  const { collections } = useStores();
  const collection = collections.get(node.attrs.modelId);
  const modelId = node.attrs.modelId;
  const { className, ...attrs } = getAttributesFromNode(node);

  React.useEffect(() => {
    if (modelId) {
      void collections.fetch(modelId);
    }
  }, [modelId, collections]);

  return (
    <Link
      {...attrs}
      className={cn(className, {
        "ProseMirror-selectednode": isSelected,
      })}
      to={collection?.path ?? `/collection/${node.attrs.modelId}`}
    >
      {collection?.icon ? (
        <Icon value={collection?.icon} color={collection?.color} size={18} />
      ) : (
        <CollectionIcon size={18} />
      )}
      {collection?.title || node.attrs.label}
    </Link>
  );
});
