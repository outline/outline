// @flow
import { StarredIcon, UnstarredIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Document from "models/Document";
import NudeButton from "./NudeButton";

type Props = {|
  document: Document,
  size?: number,
|};

function Star({ size, document, ...rest }: Props) {
  const { t } = useTranslation();
  const handleClick = React.useCallback(
    (ev: SyntheticEvent<>) => {
      ev.preventDefault();
      ev.stopPropagation();

      if (document.isStarred) {
        document.unstar();
      } else {
        document.star();
      }
    },
    [document]
  );

  if (!document) {
    return null;
  }

  return (
    <Button
      onClick={handleClick}
      size={size}
      aria-label={document.isStarred ? t("Unstar") : t("Star")}
      {...rest}
    >
      {document.isStarred ? (
        <AnimatedStar size={size} color="currentColor" />
      ) : (
        <AnimatedStar size={size} color="currentColor" as={UnstarredIcon} />
      )}
    </Button>
  );
}

const Button = styled(NudeButton)`
  color: ${(props) => props.theme.text};
`;

export const AnimatedStar = styled(StarredIcon)`
  flex-shrink: 0;
  transition: all 100ms ease-in-out;

  &:hover {
    transform: scale(1.1);
  }
  &:active {
    transform: scale(0.95);
  }
`;

export default Star;
