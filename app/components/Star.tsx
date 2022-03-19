import { StarredIcon, UnstarredIcon } from "outline-icons";
import * as React from "react";
import styled, { useTheme } from "styled-components";
import Document from "~/models/Document";
import { starDocument, unstarDocument } from "~/actions/definitions/documents";
import useActionContext from "~/hooks/useActionContext";
import { hover } from "~/styles";
import NudeButton from "./NudeButton";

type Props = {
  document: Document;
  size?: number;
};

function Star({ size, document, ...rest }: Props) {
  const theme = useTheme();
  const context = useActionContext({
    activeDocumentId: document.id,
  });

  if (!document) {
    return null;
  }

  return (
    <NudeButton
      context={context}
      action={document.isStarred ? unstarDocument : starDocument}
      size={size}
      {...rest}
    >
      {document.isStarred ? (
        <AnimatedStar size={size} color={theme.yellow} />
      ) : (
        <AnimatedStar
          size={size}
          color={theme.textTertiary}
          as={UnstarredIcon}
        />
      )}
    </NudeButton>
  );
}

export const AnimatedStar = styled(StarredIcon)`
  flex-shrink: 0;
  transition: all 100ms ease-in-out;

  &: ${hover} {
    transform: scale(1.1);
  }
  &:active {
    transform: scale(0.95);
  }

  @media print {
    display: none;
  }
`;

export default Star;
