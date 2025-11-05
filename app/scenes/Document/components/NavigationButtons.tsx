import { s } from "@shared/styles";
import React, { useMemo } from "react";
import { useHistory } from "react-router-dom";
import styled from "styled-components";
import { css } from "styled-components";
import { RealButton, RealProps } from "~/components/Button";
import useStores from "~/hooks/useStores";
import Document from "~/models/Document";
import breakpoint from "styled-components-breakpoint";
import {
  faChevronLeft,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { observer } from "mobx-react";

const NavigationButtons = ({ document }: { document: Document }) => {
  const { ui } = useStores();
  const history = useHistory();

  const docs = useMemo(() => {
    const { collection } = document;
    let navDocs: Record<string, Document | null> = {
      prevDoc: null,
      nextDoc: null,
    };

    if (collection && collection.flatDocuments) {
      const currentIndex = collection.flatDocuments.findIndex(
        (doc) => doc.id === document?.id
      );

      if (currentIndex !== undefined && currentIndex !== -1) {
        const nextIdx = currentIndex + 1;
        if (nextIdx < collection.flatDocuments.length) {
          navDocs.nextDoc = collection.flatDocuments[nextIdx];
        }

        const prevIdx = currentIndex - 1;
        if (prevIdx > -1) {
          navDocs.prevDoc = collection.flatDocuments[prevIdx];
        }
      }
    }

    return navDocs;
  }, [document.collection?.sortedDocuments, document.collection]);

  const handleNavigate = (doc: Document | null) => {
    if (doc) {
      history.push(doc.url);
    }
  };

  return (
    <Wrapper
      fullwidth={!(docs.prevDoc && docs.nextDoc)}
      sidebarOpen={!ui.sidebarIsClosed}
    >
      {docs.prevDoc && (
        <NavButton
          $neutral
          $fullwidth={!docs.nextDoc}
          onClick={() => handleNavigate(docs.prevDoc)}
        >
          <ButtonContent>
            <FontAwesomeIcon icon={faChevronLeft} />
            <ButtonText style={{ alignItems: "flex-end" }}>
              <span style={{ fontSize: 12, opacity: 0.8 }}>Previous</span>
              <span>{docs.prevDoc?.title}</span>
            </ButtonText>
          </ButtonContent>
        </NavButton>
      )}

      {docs.nextDoc && (
        <NavButton
          $neutral
          $fullwidth={!docs.prevDoc}
          onClick={() => handleNavigate(docs.nextDoc)}
        >
          <ButtonContent>
            <ButtonText style={{ alignItems: "flex-start" }}>
              <span style={{ fontSize: 12, opacity: 0.8 }}>Next</span>
              <span>{docs.nextDoc?.title}</span>
            </ButtonText>
            <FontAwesomeIcon icon={faChevronRight} />
          </ButtonContent>
        </NavButton>
      )}
    </Wrapper>
  );
};

const Wrapper = styled.div<
  React.HTMLAttributes<HTMLDivElement> & {
    fullwidth?: boolean;
    sidebarOpen?: boolean;
  }
>`
  position: sticky;
  margin-bottom: 100px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;

  ${breakpoint("tablet")`
    margin: 20px 0;
  `}

  ${breakpoint("desktop")`
    flex-direction: row;
  `}
`;

const NavButton = styled(RealButton)`
  height: 60px;
  padding: 4px 12px;
  font-weight: bold;
  color: ${s("text")};
  border-radius: 2px;
  line-height: 18px;
  background: none;
  width: 100%;

  &:hover {
    opacity: 1;
    background: none;
  }

  ${breakpoint("desktop")`
    ${(props: RealProps) => css`
      width: ${props.$fullwidth ? "100%" : "50%"};
    `}
  `}
`;

const ButtonContent = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const ButtonText = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  align-content: center;
  justify-items: center;
  bacground-color: red;
  font-size: 16px;
  font-weight: bold;
`;

export default observer(NavigationButtons);
