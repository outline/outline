import { observer } from "mobx-react";
import { CloseIcon, DocumentIcon } from "outline-icons";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import Icon from "@shared/components/Icon";
import { s, hover, ellipsis } from "@shared/styles";
import { IconType } from "@shared/types";
import { determineIconType } from "@shared/utils/icon";
import type Document from "~/models/Document";
import type Pin from "~/models/Pin";
import NudeButton from "~/components/NudeButton";
import Tooltip from "~/components/Tooltip";
import usePolicy from "~/hooks/usePolicy";
import { DocumentContextMenu } from "~/menus/DocumentContextMenu";

type Props = {
  /** The document to display */
  document: Document;
  /** The pin related to the document, when given an unpin control is shown */
  pin?: Pin;
};

/**
 * A compact, single line representation of a document displaying its icon and
 * title, linking to the document.
 */
export const DocumentChip = observer(function DocumentChip_({
  document,
  pin,
}: Props) {
  const { t } = useTranslation();
  const { icon, color } = document;
  const canPin = usePolicy(pin);
  const canDocument = usePolicy(document);
  const title = document.titleWithDefault;
  const isEmoji = determineIconType(icon) === IconType.Emoji;

  // Pins in a collection are governed by the document policy, pins on home by
  // the policy of the pin itself.
  const canUnpin = pin?.collectionId ? canDocument.unpin : canPin.delete;

  const handleUnpin = useCallback(
    async (ev: React.MouseEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
      await pin?.delete();
    },
    [pin]
  );

  return (
    <DocumentContextMenu document={document}>
      <Chip
        dir={document.dir}
        to={{
          pathname: document.path,
          state: {
            title,
          },
        }}
      >
        {icon ? (
          <Icon
            value={icon}
            color={color ?? undefined}
            initial={document.initial}
          />
        ) : (
          <DocumentIcon />
        )}
        <Title>{isEmoji ? title.replace(icon!, "") : title}</Title>
        {pin && canUnpin && (
          <Tooltip content={t("Unpin")}>
            <PinButton onClick={handleUnpin} aria-label={t("Unpin")}>
              <CloseIcon size={18} />
            </PinButton>
          </Tooltip>
        )}
      </Chip>
    </DocumentContextMenu>
  );
});

const Title = styled.span`
  ${ellipsis()}
  font-size: 14px;
  font-weight: 500;
  color: ${s("text")};
`;

const PinButton = styled(NudeButton)`
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  color: ${s("textTertiary")};
  opacity: 0;
  transition: opacity 100ms ease-in-out;

  &:${hover},
  &:active {
    color: ${s("text")};
  }
`;

const Chip = styled(Link)`
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  height: 24px;
  padding: 0px 4px 0px 2px;
  border-radius: 8px;
  border: 1px solid ${s("inputBorder")};
  color: ${s("textSecondary")};
  cursor: var(--pointer);
  user-select: none;

  &:${hover},
  &:active,
  &:focus-visible {
    background: ${s("listItemHoverBackground")};
  }

  &:${hover} ${PinButton},
  &:focus-within ${PinButton} {
    opacity: 1;
  }
`;
