import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { subDays } from "date-fns";
import { m } from "framer-motion";
import { observer } from "mobx-react";
import { CloseIcon, DocumentIcon, ClockIcon, EyeIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled, { useTheme } from "styled-components";
import Icon from "@shared/components/Icon";
import Squircle from "@shared/components/Squircle";
import { s, hover, ellipsis } from "@shared/styles";
import { IconType } from "@shared/types";
import { determineIconType } from "@shared/utils/icon";
import Document from "~/models/Document";
import Pin from "~/models/Pin";
import Flex from "~/components/Flex";
import NudeButton from "~/components/NudeButton";
import Time from "~/components/Time";
import useStores from "~/hooks/useStores";
import { useTextStats } from "~/hooks/useTextStats";
import CollectionIcon from "./Icons/CollectionIcon";
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
  const theme = useTheme();
  const { document, pin, canUpdatePin, isDraggable } = props;
  const pinnedToHome = React.useRef(!pin?.collectionId).current;
  const collection = document.collectionId
    ? collections.get(document.collectionId)
    : undefined;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: props.document.id,
    disabled: !isDraggable || !canUpdatePin,
  });

  const hasEmojiInTitle = determineIconType(document.icon) === IconType.Emoji;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleUnpin = React.useCallback(
    async (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      await pin?.delete();
    },
    [pin]
  );

  // If the document was updated within the last 7 days, show a timestamp instead of reading time
  const isRecentlyUpdated =
    new Date(document.updatedAt) > subDays(new Date(), 7);

  return (
    <Reorderable
      ref={setNodeRef}
      style={style}
      $isDragging={isDragging}
      {...attributes}
      {...listeners}
      tabIndex={-1}
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
          $isDragging={isDragging}
          to={{
            pathname: document.url,
            state: {
              title: document.titleWithDefault,
            },
          }}
        >
          <Content justify="space-between" column>
            <Fold
              width="20"
              height="21"
              viewBox="0 0 20 21"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M19.5 20.5H6C2.96243 20.5 0.5 18.0376 0.5 15V0.5H0.792893L19.5 19.2071V20.5Z" />
              <path d="M19.5 19.5H6C2.96243 19.5 0.5 17.0376 0.5 14V0.5H0.792893L19.5 19.2071V19.5Z" />
            </Fold>

            {document.icon ? (
              <DocumentSquircle
                icon={document.icon}
                color={document.color ?? undefined}
              />
            ) : (
              <Squircle
                color={
                  collection?.color ??
                  (pinnedToHome ? theme.slateLight : theme.slateDark)
                }
              >
                {collection?.icon &&
                collection?.icon !== "letter" &&
                collection?.icon !== "collection" &&
                pinnedToHome ? (
                  <CollectionIcon collection={collection} color="white" />
                ) : (
                  <DocumentIcon color="white" />
                )}
              </Squircle>
            )}
            <div>
              <Heading dir={document.dir}>
                {hasEmojiInTitle
                  ? document.titleWithDefault.replace(document.icon!, "")
                  : document.titleWithDefault}
              </Heading>
              <DocumentMeta size="xsmall">
                {isRecentlyUpdated ? (
                  <>
                    <Clock size={18} />
                    <Time dateTime={document.updatedAt} addSuffix shorten />
                  </>
                ) : (
                  <ReadingTime document={document} />
                )}
              </DocumentMeta>
            </div>
          </Content>
          {canUpdatePin && (
            <Actions dir={document.dir} gap={4}>
              {!isDragging && pin && (
                <Tooltip content={t("Unpin")}>
                  <PinButton onClick={handleUnpin} aria-label={t("Unpin")}>
                    <CloseIcon />
                  </PinButton>
                </Tooltip>
              )}
            </Actions>
          )}
        </DocumentLink>
      </AnimatePresence>
    </Reorderable>
  );
}

const ReadingTime = ({ document }: { document: Document }) => {
  const { t } = useTranslation();
  const markdown = React.useMemo(() => document.toMarkdown(), [document]);
  const stats = useTextStats(markdown);

  return (
    <>
      <EyeIcon size={18} />
      {t(`{{ minutes }}m read`, {
        minutes: stats.total.readingTime,
      })}
    </>
  );
};

const DocumentSquircle = ({
  icon,
  color,
}: {
  icon: string;
  color?: string;
}) => {
  const theme = useTheme();
  const iconType = determineIconType(icon)!;
  const squircleColor = iconType === IconType.SVG ? color : theme.slateLight;

  return (
    <Squircle color={squircleColor}>
      <Icon value={icon} color={theme.white} forceColor />
    </Squircle>
  );
};

const Clock = styled(ClockIcon)`
  flex-shrink: 0;
`;

const AnimatePresence = styled(m.div)`
  width: 100%;
  height: 100%;
`;

const Fold = styled.svg`
  fill: ${s("background")};
  stroke: ${s("inputBorder")};
  background: ${s("background")};

  position: absolute;
  top: -1px;
  right: -2px;
`;

const PinButton = styled(NudeButton)`
  color: ${s("textTertiary")};

  &:${hover},
  &:active {
    color: ${s("text")};
  }
`;

const Actions = styled(Flex)`
  position: absolute;
  top: 4px;
  right: ${(props) => (props.dir === "rtl" ? "auto" : "4px")};
  left: ${(props) => (props.dir === "rtl" ? "4px" : "auto")};
  opacity: 0;
  color: ${s("textTertiary")};

  // move actions above content
  z-index: 2;
`;

const Reorderable = styled.div<{ $isDragging: boolean }>`
  position: relative;
  user-select: none;
  touch-action: none;
  width: 170px;
  height: 180px;
  transition: box-shadow 200ms ease;

  // move above other cards when dragging
  z-index: ${(props) => (props.$isDragging ? 1 : "inherit")};
  pointer-events: ${(props) => (props.$isDragging ? "none" : "inherit")};

  &: ${hover} ${Actions} {
    opacity: 1;
  }
`;

const Content = styled(Flex)`
  min-width: 0;
  height: 100%;
`;

const DocumentMeta = styled(Text)`
  ${ellipsis()}
  display: flex;
  align-items: center;
  gap: 2px;
  color: ${s("textTertiary")};
  margin: 0 0 0 -2px;
`;

const DocumentLink = styled(Link)<{
  $isDragging?: boolean;
}>`
  position: relative;
  display: block;
  padding: 12px;
  width: 100%;
  height: 100%;
  border-radius: 8px;
  cursor: var(--pointer);
  background: ${s("background")};
  transition: transform 50ms ease-in-out;
  border: 1px solid ${s("inputBorder")};
  border-bottom-width: 2px;
  border-right-width: 2px;

  ${Actions} {
    opacity: 0;
  }

  &:${hover},
  &:active,
  &:focus,
  &:focus-within {
    transform: ${(props) => (props.$isDragging ? "scale(1.1)" : "scale(1.08)")}
      rotate(-2deg);
    box-shadow: ${(props) =>
      props.$isDragging
        ? "0 0 20px rgba(0,0,0,0.2);"
        : "0 0 10px rgba(0,0,0,0.1)"};
    z-index: 1;

    ${Fold} {
      display: none;
    }

    ${Actions} {
      opacity: 1;
    }
  }
`;

const Heading = styled.h3`
  margin-top: 0;
  margin-bottom: 0.35em;
  line-height: 22px;
  max-height: 66px; // 3*line-height
  overflow: hidden;

  color: ${s("text")};
  font-family: ${s("fontFamily")};
  font-weight: 500;
`;

export default observer(DocumentCard);
