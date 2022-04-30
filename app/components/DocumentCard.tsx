import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { m } from "framer-motion";
import { observer } from "mobx-react";
import { CloseIcon, DocumentIcon, ClockIcon } from "outline-icons";
import { getLuminance, transparentize } from "polished";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled, { css } from "styled-components";
import Document from "~/models/Document";
import Pin from "~/models/Pin";
import Flex from "~/components/Flex";
import NudeButton from "~/components/NudeButton";
import Time from "~/components/Time";
import useStores from "~/hooks/useStores";
import CollectionIcon from "./CollectionIcon";
import Text from "./Text";
import Tooltip from "./Tooltip";

type Props = {
  /** The pin record */
  pin: Pin | undefined;
  /** The document related to the pin */
  document: Document;
  /** Whether the user has permission to delete or reorder the pin */
  canUpdatePin?: boolean;
  /** Whether this pin can be reordered by dragging */
  isDraggable?: boolean;
};

function DocumentCard(props: Props) {
  const { t } = useTranslation();
  const { collections } = useStores();
  const { document, pin, canUpdatePin, isDraggable } = props;
  const collection = collections.get(document.collectionId);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.document.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleUnpin = React.useCallback(() => {
    pin?.delete();
  }, [pin]);

  return (
    <Reorderable
      ref={setNodeRef}
      style={style}
      $isDragging={isDragging}
      {...attributes}
    >
      <AnimatePresence
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{
          opacity: 1,
          scale: 1,
          transition: {
            type: "spring",
            bounce: 0.6,
          },
        }}
        exit={{ opacity: 0, scale: 0.95 }}
      >
        <DocumentLink
          dir={document.dir}
          style={{
            background:
              collection?.color && getLuminance(collection.color) < 0.6
                ? collection.color
                : undefined,
          }}
          $isDragging={isDragging}
          to={{
            pathname: document.url,
            state: {
              title: document.titleWithDefault,
            },
          }}
        >
          <Content justify="space-between" column>
            {collection?.icon &&
            collection?.icon !== "collection" &&
            !pin?.collectionId ? (
              <CollectionIcon collection={collection} color="white" />
            ) : (
              <DocumentIcon color="white" />
            )}
            <div>
              <Heading dir={document.dir}>{document.titleWithDefault}</Heading>
              <DocumentMeta size="xsmall">
                <ClockIcon color="currentColor" size={18} />{" "}
                <Time dateTime={document.updatedAt} addSuffix shorten />
              </DocumentMeta>
            </div>
          </Content>
        </DocumentLink>
        {canUpdatePin && (
          <Actions dir={document.dir} gap={4}>
            {!isDragging && pin && (
              <Tooltip tooltip={t("Unpin")}>
                <PinButton onClick={handleUnpin} aria-label={t("Unpin")}>
                  <CloseIcon color="currentColor" />
                </PinButton>
              </Tooltip>
            )}
            {isDraggable && (
              <DragHandle $isDragging={isDragging} {...listeners}>
                :::
              </DragHandle>
            )}
          </Actions>
        )}
      </AnimatePresence>
    </Reorderable>
  );
}

const PinButton = styled(NudeButton)`
  color: ${(props) => props.theme.white75};

  &:hover,
  &:active {
    color: ${(props) => props.theme.white};
  }
`;

const Actions = styled(Flex)`
  position: absolute;
  top: 12px;
  right: ${(props) => (props.dir === "rtl" ? "auto" : "12px")};
  left: ${(props) => (props.dir === "rtl" ? "12px" : "auto")};
  opacity: 0;
  transition: opacity 100ms ease-in-out;

  // move actions above content
  z-index: 2;
`;

const DragHandle = styled.div<{ $isDragging: boolean }>`
  cursor: ${(props) => (props.$isDragging ? "grabbing" : "grab")};
  padding: 0 4px;
  font-weight: bold;
  color: ${(props) => props.theme.white75};
  line-height: 1.35;

  &:hover,
  &:active {
    color: ${(props) => props.theme.white};
  }
`;

const AnimatePresence = m.div;

const Reorderable = styled.div<{ $isDragging: boolean }>`
  position: relative;
  user-select: none;
  border-radius: 8px;

  // move above other cards when dragging
  z-index: ${(props) => (props.$isDragging ? 1 : "inherit")};
  transform: scale(${(props) => (props.$isDragging ? "1.025" : "1")});
  box-shadow: ${(props) =>
    props.$isDragging ? "0 0 20px rgba(0,0,0,0.3);" : "0 0 0 rgba(0,0,0,0)"};

  &:hover ${Actions} {
    opacity: 1;
  }
`;

const Content = styled(Flex)`
  min-width: 0;
  height: 100%;

  // move content above ::after
  position: relative;
  z-index: 1;
`;

const DocumentMeta = styled(Text)`
  display: flex;
  align-items: center;
  gap: 2px;
  color: ${(props) => transparentize(0.25, props.theme.white)};
  margin: 0;
`;

const DocumentLink = styled(Link)<{
  $menuOpen?: boolean;
  $isDragging?: boolean;
}>`
  position: relative;
  display: block;
  padding: 12px;
  border-radius: 8px;
  height: 160px;
  background: ${(props) => props.theme.slate};
  color: ${(props) => props.theme.white};
  transition: transform 50ms ease-in-out;

  &:after {
    content: "";
    display: block;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.1));
    border-radius: 8px;
    pointer-events: none;
  }

  ${Actions} {
    opacity: 0;
  }

  &:hover,
  &:active,
  &:focus,
  &:focus-within {
    ${Actions} {
      opacity: 1;
    }

    ${(props) =>
      !props.$isDragging &&
      css`
        &:after {
          background: rgba(0, 0, 0, 0.1);
        }
      `}
  }

  ${(props) =>
    props.$menuOpen &&
    css`
      background: ${(props) => props.theme.listItemHoverBackground};

      ${Actions} {
        opacity: 1;
      }
    `}
`;

const Heading = styled.h3`
  margin-top: 0;
  margin-bottom: 0.35em;
  line-height: 22px;
  max-height: 66px; // 3*line-height
  overflow: hidden;

  color: ${(props) => props.theme.white};
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
    Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
`;

export default observer(DocumentCard);
